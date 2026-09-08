import type { Model } from '@bifrost/models';
import type { NormalizedRequest } from '@bifrost/shared';
import { filterCandidates } from '../src/constraints';
import type { RoutingCandidate, HardConstraints } from '../src/types';

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'test-model',
    provider: 'test-provider',
    displayName: 'Test Model',
    contextWindow: 8192,
    capabilities: ['chat', 'completion'],
    inputPrice: 0.01,
    outputPrice: 0.03,
    enabled: true,
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<RoutingCandidate> = {}): RoutingCandidate {
  return {
    model: makeModel(),
    provider: { id: 'test-provider', name: 'Test Provider', enabled: true },
    capabilities: ['chat', 'completion'],
    qualityScore: 0.8,
    costScore: 0.9,
    latencyScore: 0.7,
    reliabilityScore: 0.95,
    availabilityScore: 1.0,
    priority: 50,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'test-model',
    messages: [],
    ...overrides,
  };
}

describe('filterCandidates', () => {
  const defaultConstraints: HardConstraints = {
    requiredCapabilities: [],
    minContextWindow: 0,
    disabledProviders: [],
    disabledModels: [],
    userRestrictions: [],
  };

  test('passes all candidates with no constraints', () => {
    const candidates = [makeCandidate(), makeCandidate()];
    const results = filterCandidates(candidates, defaultConstraints, makeRequest());
    expect(results.every(r => r.passed)).toBe(true);
  });

  test('filters disabled provider', () => {
    const candidates = [makeCandidate(), makeCandidate({ provider: { id: 'blocked', name: 'Blocked', enabled: true } })];
    const constraints: HardConstraints = { ...defaultConstraints, disabledProviders: ['blocked'] };
    const results = filterCandidates(candidates, constraints, makeRequest());
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
    expect(results[1].reasons).toContain('Provider "blocked" is disabled by user restrictions');
  });

  test('filters disabled model', () => {
    const candidates = [makeCandidate(), makeCandidate({ model: makeModel({ id: 'blocked-model' }) })];
    const constraints: HardConstraints = { ...defaultConstraints, disabledModels: ['blocked-model'] };
    const results = filterCandidates(candidates, constraints, makeRequest());
    expect(results[0].passed).toBe(true);
    expect(results[1].passed).toBe(false);
  });

  test('filters insufficient context window', () => {
    const candidates = [makeCandidate({ model: makeModel({ contextWindow: 4096 }) })];
    const constraints: HardConstraints = { ...defaultConstraints, minContextWindow: 8192 };
    const results = filterCandidates(candidates, constraints, makeRequest());
    expect(results[0].passed).toBe(false);
  });

  test('filters missing capabilities', () => {
    const candidates = [makeCandidate({ capabilities: ['chat'] })];
    const constraints: HardConstraints = { ...defaultConstraints, requiredCapabilities: ['vision'] };
    const results = filterCandidates(candidates, constraints, makeRequest());
    expect(results[0].passed).toBe(false);
    expect(results[0].reasons).toContain('Model "test-model" missing capability: vision');
  });

  test('filters over budget', () => {
    const candidates = [makeCandidate({ model: makeModel({ inputPrice: 10, outputPrice: 10 }) })];
    const constraints: HardConstraints = { ...defaultConstraints, budget: 0.01 };
    const request = makeRequest({ messages: [{ role: 'user', content: 'Hello world this is a test' }] });
    const results = filterCandidates(candidates, constraints, request);
    expect(results[0].passed).toBe(false);
  });

  test('passes under budget', () => {
    const candidates = [makeCandidate({ model: makeModel({ inputPrice: 0, outputPrice: 0 }) })];
    const constraints: HardConstraints = { ...defaultConstraints, budget: 0.01 };
    const request = makeRequest({ messages: [{ role: 'user', content: 'Hi' }] });
    const results = filterCandidates(candidates, constraints, request);
    expect(results[0].passed).toBe(true);
  });

  test('filters user restrictions', () => {
    const candidates = [makeCandidate()];
    const constraints: HardConstraints = { ...defaultConstraints, userRestrictions: ['test-provider'] };
    const results = filterCandidates(candidates, constraints, makeRequest());
    expect(results[0].passed).toBe(false);
  });

  test('returns FilterResult for each candidate', () => {
    const candidates = [makeCandidate(), makeCandidate({ model: makeModel({ id: 'x' }) })];
    const results = filterCandidates(candidates, defaultConstraints, makeRequest());
    expect(results).toHaveLength(2);
    expect(results[0].candidate).toBe(candidates[0]);
    expect(results[1].candidate).toBe(candidates[1]);
  });
});
