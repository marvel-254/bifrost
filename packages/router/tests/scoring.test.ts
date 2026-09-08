import { scoreCandidate } from '../src/scoring';
import type { RoutingCandidate, StrategyWeights } from '../src/types';
import type { NormalizedRequest } from '@bifrost/shared';
import type { Model } from '@bifrost/models';

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

describe('scoreCandidate', () => {
  const weights: StrategyWeights = {
    capabilityMatch: 0.30,
    quality: 0.25,
    reliability: 0.15,
    costEfficiency: 0.15,
    latency: 0.10,
    availability: 0.05,
  };

  test('computes a deterministic score', () => {
    const candidate = makeCandidate();
    const request = makeRequest();
    const score1 = scoreCandidate(candidate, weights, request);
    const score2 = scoreCandidate(candidate, weights, request);
    expect(score1).toEqual(score2);
  });

  test('returns scores for all dimensions', () => {
    const candidate = makeCandidate();
    const request = makeRequest();
    const scores = scoreCandidate(candidate, weights, request);
    expect(scores).toHaveProperty('capabilityMatch');
    expect(scores).toHaveProperty('quality');
    expect(scores).toHaveProperty('reliability');
    expect(scores).toHaveProperty('costEfficiency');
    expect(scores).toHaveProperty('latency');
    expect(scores).toHaveProperty('availability');
    expect(scores).toHaveProperty('total');
  });

  test('total is weighted sum of dimensions', () => {
    const candidate = makeCandidate();
    const request = makeRequest();
    const scores = scoreCandidate(candidate, weights, request);
    const expected =
      weights.capabilityMatch * scores.capabilityMatch +
      weights.quality * scores.quality +
      weights.reliability * scores.reliability +
      weights.costEfficiency * scores.costEfficiency +
      weights.latency * scores.latency +
      weights.availability * scores.availability;
    expect(scores.total).toBeCloseTo(expected, 2);
  });

  test('bonuses capability match when tools are requested', () => {
    const candidateWithTools = makeCandidate({ capabilities: ['chat', 'completion', 'tool_use'] });
    const candidateWithoutTools = makeCandidate({ capabilities: ['chat', 'completion'] });
    const requestWithTools = makeRequest({ tools: [{ type: 'function', function: { name: 'test' } }] });

    const scoreWithTools = scoreCandidate(candidateWithTools, weights, requestWithTools);
    const scoreWithoutTools = scoreCandidate(candidateWithoutTools, weights, requestWithTools);

    expect(scoreWithTools.capabilityMatch).toBe(1.0);
    expect(scoreWithoutTools.capabilityMatch).toBe(0.0);
  });

  test('same inputs produce identical scores across calls', () => {
    const candidate = makeCandidate();
    const request = makeRequest();
    const scores: ReturnType<typeof scoreCandidate>[] = [];
    for (let i = 0; i < 100; i++) {
      scores.push(scoreCandidate(candidate, weights, request));
    }
    const first = scores[0];
    for (const s of scores) {
      expect(s).toEqual(first);
    }
  });
});
