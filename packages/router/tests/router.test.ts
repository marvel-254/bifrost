import { route } from '../src/router';
import { buildCandidates } from '../src/candidates';
import type { RoutingStrategy } from '../src/types';
import type { NormalizedRequest } from '@bifrost/shared';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry } from '@bifrost/providers';

describe('router', () => {
  let models: ModelRegistry;
  let providers: ProviderRegistry;

  beforeEach(() => {
    models = new ModelRegistry({
      models: [
        { id: 'fast-model', provider: 'p1', displayName: 'Fast', contextWindow: 8192, capabilities: ['chat'], inputPrice: 0.01, outputPrice: 0.03, enabled: true },
        { id: 'cheap-model', provider: 'p2', displayName: 'Cheap', contextWindow: 8192, capabilities: ['chat'], inputPrice: 0, outputPrice: 0, enabled: true },
        { id: 'quality-model', provider: 'p3', displayName: 'Quality', contextWindow: 128000, capabilities: ['chat', 'tool_use'], inputPrice: 5, outputPrice: 15, enabled: true },
      ],
    });
    providers = new ProviderRegistry();
    providers.register({ name: 'p1', authenticate: async () => true, listModels: async () => [], complete: async () => ({}), stream: async () => {}, healthCheck: async () => ({ healthy: true, latencyMs: 100 }) } as any);
    providers.register({ name: 'p2', authenticate: async () => true, listModels: async () => [], complete: async () => ({}), stream: async () => {}, healthCheck: async () => ({ healthy: true, latencyMs: 200 }) } as any);
    providers.register({ name: 'p3', authenticate: async () => true, listModels: async () => [], complete: async () => ({}), stream: async () => {}, healthCheck: async () => ({ healthy: true, latencyMs: 500 }) } as any);
  });

  function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
    return {
      model: 'auto',
      messages: [{ role: 'user', content: 'Hello' }],
      ...overrides,
    };
  }

  test('returns error when no candidates provided', () => {
    const strategy: RoutingStrategy = {
      mode: 'balanced',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, []);
    expect(decision.primary).toBeNull();
    expect(decision.reasoning).toContain('No candidates provided');
  });

  test('balanced selects highest total score', () => {
    const candidates = buildCandidates(models, providers, {
      latencyMap: new Map([
        ['p1::fast-model', 50],
        ['p2::cheap-model', 500],
        ['p3::quality-model', 200],
      ]),
    });
    const strategy: RoutingStrategy = {
      mode: 'balanced',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, candidates);
    expect(decision.primary).not.toBeNull();
    expect(decision.primary?.model.id).toBe('fast-model');
  });

  test('cheapest selects free model', () => {
    const candidates = buildCandidates(models, providers);
    const strategy: RoutingStrategy = {
      mode: 'cheapest',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, candidates);
    expect(decision.primary?.model.id).toBe('cheap-model');
  });

  test('fastest selects lowest latency', () => {
    const candidates = buildCandidates(models, providers, { latencyMap: new Map([['p1::fast-model', 50], ['p2::cheap-model', 200], ['p3::quality-model', 500]]) });
    const strategy: RoutingStrategy = {
      mode: 'fastest',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, candidates);
    expect(decision.primary?.model.id).toBe('fast-model');
  });

  test('returns fallbacks', () => {
    const candidates = buildCandidates(models, providers);
    const strategy: RoutingStrategy = {
      mode: 'balanced',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, candidates);
    expect(decision.fallbacks.length).toBeGreaterThan(0);
    expect(decision.fallbacks.length).toBeLessThanOrEqual(2);
  });

  test('includes reasoning in decision', () => {
    const candidates = buildCandidates(models, providers);
    const strategy: RoutingStrategy = {
      mode: 'balanced',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision = route(makeRequest(), strategy, candidates);
    expect(decision.reasoning).toContain('mode=balanced');
    expect(decision.reasoning).toContain('selected=');
  });

  test('deterministic: same inputs produce same decision', () => {
    const candidates = buildCandidates(models, providers);
    const strategy: RoutingStrategy = {
      mode: 'balanced',
      weights: { capabilityMatch: 0.30, quality: 0.25, reliability: 0.15, costEfficiency: 0.15, latency: 0.10, availability: 0.05 },
      hardConstraints: { requiredCapabilities: [], minContextWindow: 0, disabledProviders: [], disabledModels: [], userRestrictions: [] },
    };
    const decision1 = route(makeRequest(), strategy, candidates);
    const decision2 = route(makeRequest(), strategy, candidates);
    expect(decision1.primary?.model.id).toBe(decision2.primary?.model.id);
    expect(decision1.scores?.total).toBe(decision2.scores?.total);
  });
});
