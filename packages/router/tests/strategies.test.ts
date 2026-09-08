import { selectManual } from '../src/strategies/manual';
import { selectPriority } from '../src/strategies/priority';
import { selectCheapest } from '../src/strategies/cheapest';
import { selectFastest } from '../src/strategies/fastest';
import { selectBalanced } from '../src/strategies/balanced';
import { selectAuto } from '../src/strategies/auto';
import type { RoutingCandidate, ScoredCandidate } from '../src/types';
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

function makeScoredCandidate(overrides: Partial<RoutingCandidate> = {}, scores: Partial<{ total: number }> = {}): ScoredCandidate {
  const candidate: RoutingCandidate = {
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
  return {
    candidate,
    scores: {
      capabilityMatch: 1.0,
      quality: candidate.qualityScore,
      reliability: candidate.reliabilityScore,
      costEfficiency: candidate.costScore,
      latency: candidate.latencyScore,
      availability: candidate.availabilityScore,
      total: scores.total ?? 0.85,
    },
  };
}

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'test-model',
    messages: [],
    ...overrides,
  };
}

describe('strategies', () => {
  describe('selectManual', () => {
    test('returns null for empty candidates', () => {
      const result = selectManual([], makeRequest());
      expect(result.primary).toBeNull();
    });

    test('finds explicit model match', () => {
      const candidates = [makeScoredCandidate({}, { total: 0.5 })];
      const request = makeRequest({ model: 'test-model' });
      const result = selectManual(candidates, request);
      expect(result.primary).toEqual(candidates[0].candidate);
    });

    test('finds provider match when model not found', () => {
      const candidates = [makeScoredCandidate({ candidate: makeScoredCandidate().candidate }, { total: 0.5 })];
      const request = makeRequest({ model: 'test-provider' });
      const result = selectManual(candidates, request);
      expect(result.primary).toEqual(candidates[0].candidate);
    });

    test('returns first enabled candidate when no explicit model', () => {
      const candidates = [makeScoredCandidate(), makeScoredCandidate({}, { total: 0.5 })];
      const request = makeRequest({ model: '' });
      const result = selectManual(candidates, request);
      expect(result.primary).toEqual(candidates[0].candidate);
    });
  });

  describe('selectPriority', () => {
    test('returns highest priority candidate', () => {
      const candidates = [
        makeScoredCandidate({ priority: 30 }),
        makeScoredCandidate({ priority: 90 }),
        makeScoredCandidate({ priority: 50 }),
      ];
      const result = selectPriority(candidates);
      expect(result.primary).toEqual(candidates[1].candidate);
    });

    test('returns fallbacks', () => {
      const candidates = [
        makeScoredCandidate({ priority: 90 }),
        makeScoredCandidate({ priority: 80 }),
        makeScoredCandidate({ priority: 70 }),
      ];
      const result = selectPriority(candidates);
      expect(result.fallbacks).toHaveLength(2);
      expect(result.fallbacks[0]).toEqual(candidates[1].candidate);
    });
  });

  describe('selectCheapest', () => {
    test('returns lowest cost candidate', () => {
      const candidates = [
        makeScoredCandidate({ costScore: 0.1 }),
        makeScoredCandidate({ costScore: 0.9 }),
        makeScoredCandidate({ costScore: 0.5 }),
      ];
      const result = selectCheapest(candidates);
      expect(result.primary).toEqual(candidates[1].candidate);
    });
  });

  describe('selectFastest', () => {
    test('returns lowest latency candidate', () => {
      const candidates = [
        makeScoredCandidate({ latencyScore: 0.1 }),
        makeScoredCandidate({ latencyScore: 0.9 }),
        makeScoredCandidate({ latencyScore: 0.5 }),
      ];
      const result = selectFastest(candidates);
      expect(result.primary).toEqual(candidates[1].candidate);
    });
  });

  describe('selectBalanced', () => {
    test('returns highest total score candidate', () => {
      const candidates = [
        makeScoredCandidate({}, { total: 0.3 }),
        makeScoredCandidate({}, { total: 0.9 }),
        makeScoredCandidate({}, { total: 0.6 }),
      ];
      const result = selectBalanced(candidates);
      expect(result.primary).toEqual(candidates[1].candidate);
    });
  });

  describe('selectAuto', () => {
    test('falls back to balanced for unknown classification', () => {
      const candidates = [
        makeScoredCandidate({}, { total: 0.3 }),
        makeScoredCandidate({}, { total: 0.9 }),
      ];
      const result = selectAuto(candidates, makeRequest());
      expect(result.primary).toEqual(candidates[1].candidate);
    });
  });
});
