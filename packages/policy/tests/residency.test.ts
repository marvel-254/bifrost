import { DataResidencyEngine, residencyEngine, setProviderRegion, getProviderRegion, setResidencyAuditLogger } from '../src/residency';
import type { ProviderAdapter } from '@bifrost/providers';

describe('DataResidencyEngine', () => {
  const engine = new DataResidencyEngine();

  function makeProvider(name: string, region: 'us' | 'eu' | 'ap' | 'global'): ProviderAdapter {
    const provider = {
      name,
      capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, contextWindow: 8192 },
      chat: async () => ({ id: '1', object: 'chat.completion', created: Date.now(), model: 'test', choices: [] }),
      stream: async function* () { yield { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test', choices: [] }; },
      embeddings: async () => ({ object: 'list', data: [] }),
      health: async () => ({ healthy: true }),
      estimateCost: async () => null,
    } as unknown as ProviderAdapter;
    setProviderRegion(provider, { region, provider: name });
    return provider;
  }

  test('filters providers by allowed_regions', () => {
    const providers = [makeProvider('us-prov', 'us'), makeProvider('eu-prov', 'eu'), makeProvider('ap-prov', 'ap')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['eu', 'us'],
      prohibited_regions: [],
      require_residency: false,
    });
    expect(decision.allowed).toBe(true);
    expect(decision.filteredProviders).toEqual(['us-prov', 'eu-prov']);
  });

  test('require_residency filters by default_region', () => {
    const providers = [makeProvider('us-prov', 'us'), makeProvider('eu-prov', 'eu'), makeProvider('global-prov', 'global')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['eu', 'us'],
      prohibited_regions: [],
      require_residency: true,
      default_region: 'eu',
    });
    expect(decision.filteredProviders).toEqual(['eu-prov', 'global-prov']);
  });

  test('prohibited_regions blocks matching providers', () => {
    const providers = [makeProvider('us-prov', 'us'), makeProvider('eu-prov', 'eu')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['us', 'eu'],
      prohibited_regions: ['us'],
      require_residency: false,
    });
    expect(decision.filteredProviders).toEqual(['eu-prov']);
  });

  test('global providers always pass', () => {
    const providers = [makeProvider('global-prov', 'global')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['eu'],
      prohibited_regions: [],
      require_residency: true,
      default_region: 'eu',
    });
    expect(decision.filteredProviders).toEqual(['global-prov']);
  });

  test('returns allowed=false when no providers remain', () => {
    const providers = [makeProvider('us-prov', 'us')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['eu'],
      prohibited_regions: [],
      require_residency: true,
      default_region: 'eu',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.filteredProviders).toEqual([]);
  });

  test('validates residency config', () => {
    const valid = engine.validateResidencyConfig({
      allowed_regions: ['us', 'eu'],
      prohibited_regions: ['ap'],
      require_residency: false,
    });
    expect(valid.valid).toBe(true);

    const invalid = engine.validateResidencyConfig({
      allowed_regions: ['invalid-region'],
      prohibited_regions: [],
      require_residency: true,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  test('getProviderRegion works', () => {
    const provider = makeProvider('test', 'us');
    const meta = getProviderRegion(provider);
    expect(meta?.region).toBe('us');
    expect(meta?.provider).toBe('test');
  });

  test('logResidencyDecision invokes audit logger', () => {
    let logged: unknown;
    setResidencyAuditLogger((entry) => { logged = entry; });

    const providers = [makeProvider('us-prov', 'us')];
    const decision = engine.filterProvidersByRegion(providers, {
      allowed_regions: ['us'],
      prohibited_regions: [],
      require_residency: false,
    });

    engine.logResidencyDecision({
      timestamp: new Date().toISOString(),
      tenant_id: 'tenant-1',
      request_id: 'req-1',
      decision,
      providers_before: 1,
      providers_after: 1,
    });

    expect(logged).toBeDefined();
    setResidencyAuditLogger(null);
  });
});
