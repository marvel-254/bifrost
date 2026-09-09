import { PolicyEngine } from '../src/policy-engine';
import type { NormalizedRequest } from '@bifrost/shared';

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'hello' }],
    ...overrides,
  };
}

describe('PolicyEngine', () => {
  test('returns default decision when no policies match', () => {
    const engine = new PolicyEngine();
    const req = makeRequest();
    const decision = engine.evaluatePolicy(req, { request: req });
    expect(decision.matchedPolicy?.name).toBe('default');
    expect(decision.routingStrategy).toBe('balanced');
    expect(decision.cacheEnabled).toBe(true);
  });

  test('evaluates YAML policy', () => {
    const engine = new PolicyEngine();
    const policies = engine.loadYaml(`
policies:
  - name: yaml-test
    priority: 10
    version: v1
    match:
      tenant: tenant-1
      conditions:
        AND: []
        OR: []
    constraints:
      max_cost: 5
      max_latency_ms: 2000
      data_region: eu
      allowed_regions: [eu, us]
    require:
      tools: true
      structured_output: false
      capabilities: [chat]
    prefer:
      quality: high
      cost: low
      latency: medium
    fallback:
      strategy: auto
    optimization:
      compression: safe
      cache: true
`);
    for (const p of policies) engine.registerPolicy(p);

    const req = makeRequest();
    const decision = engine.evaluatePolicy(req, { tenantId: 'tenant-1', request: req });

    expect(decision.matchedPolicy?.name).toBe('yaml-test');
    expect(decision.effectiveConstraints.max_cost).toBe(5);
    expect(decision.effectiveConstraints.max_latency_ms).toBe(2000);
    expect(decision.effectiveConstraints.data_region).toBe('eu');
    expect(decision.allowedRegions).toEqual(['eu', 'us']);
    expect(decision.requiresTools).toBe(true);
    expect(decision.requiredCapabilities).toEqual(['chat']);
    expect(decision.qualityPreference).toBe('high');
    expect(decision.costPreference).toBe('low');
    expect(decision.compressionLevel).toBe('safe');
    expect(decision.fallbackStrategy).toBe('auto');
  });

  test('applies auto compression rules', () => {
    const engine = new PolicyEngine();
    const policies = engine.loadYaml(`
policies:
  - name: auto-compress
    priority: 10
    version: v1
    match:
      conditions:
        AND: []
        OR: []
    optimization:
      compression: auto
      cache: true
`);
    for (const p of policies) engine.registerPolicy(p);

    const streaming = engine.evaluatePolicy(makeRequest({ stream: true }), { request: makeRequest({ stream: true }) });
    expect(streaming.compressionLevel).toBe('safe');

    const tools = engine.evaluatePolicy(makeRequest({ tools: [{ type: 'function', function: { name: 't', parameters: {} } }] }), { request: makeRequest({ tools: [{ type: 'function', function: { name: 't', parameters: {} } }] }) });
    expect(tools.compressionLevel).toBe('safe');
  });

  test('inherits from base policy', () => {
    const engine = new PolicyEngine();
    engine.registerPolicy({
      name: 'base',
      priority: 1,
      version: 'v1',
      enabled: true,
      match: { tags: [], conditions: { AND: [], OR: [] } },
      constraints: { max_cost: 100 },
      require: { tools: false, structured_output: false, capabilities: [] },
      prefer: { quality: 'medium', cost: 'medium', latency: 'medium' },
      fallback: { strategy: 'auto' },
      optimization: { compression: 'auto', cache: true },
    });
    engine.registerPolicy({
      name: 'derived',
      priority: 10,
      version: 'v1',
      extends: 'base',
      enabled: true,
      match: { tags: [], conditions: { AND: [], OR: [] } },
      constraints: { max_cost: 50 },
      require: { tools: false, structured_output: false, capabilities: [] },
      prefer: { quality: 'medium', cost: 'medium', latency: 'medium' },
      fallback: { strategy: 'auto' },
      optimization: { compression: 'auto', cache: true },
    });

    const req = makeRequest();
    const decision = engine.evaluatePolicy(req, { request: req });
    expect(decision.matchedPolicy?.name).toBe('derived');
    expect(decision.effectiveConstraints.max_cost).toBe(50);
  });
});
