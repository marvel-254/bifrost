import type { NormalizedRequest } from '@bifrost/shared';
import type { RoutingCandidate, RoutingStrategy, RoutingDecision, RoutingScores, ScoredCandidate } from './types';
import { filterCandidates } from './constraints';
import { scoreCandidate } from './scoring';
import {
  selectManual,
  selectPriority,
  selectCheapest,
  selectFastest,
  selectBalanced,
  selectAuto,
  type StrategyResult,
} from './strategies';

export function route(
  request: NormalizedRequest,
  strategy: RoutingStrategy,
  candidates: RoutingCandidate[]
): RoutingDecision {
  const filterResults = filterCandidates(candidates, strategy.hardConstraints, request);

  const eligible: ScoredCandidate[] = [];
  const rejected: RoutingCandidate[] = [];

  for (const result of filterResults) {
    if (result.passed) {
      const scores = scoreCandidate(result.candidate, strategy.weights, request);
      eligible.push({ candidate: result.candidate, scores });
    } else {
      rejected.push(result.candidate);
    }
  }

  if (eligible.length === 0) {
    return {
      primary: null,
      fallbacks: [],
      strategy,
      reasoning: rejected.length > 0 ? rejected.map(c => `"${c.model.id}" filtered`).join(' | ') : 'No candidates provided',
      scores: null,
    };
  }

  const result = selectStrategy(strategy.mode, eligible, request);
  const topScores = eligible.find(e => e.candidate === result.primary)?.scores ?? eligible[0].scores;

  return {
    primary: result.primary,
    fallbacks: result.fallbacks,
    strategy,
    reasoning: buildReasoning(strategy.mode, result.primary, topScores, rejected.length),
    scores: topScores,
  };
}

function selectStrategy(mode: string, candidates: ScoredCandidate[], request: NormalizedRequest): StrategyResult {
  switch (mode) {
    case 'manual':
      return selectManual(candidates, request);
    case 'priority':
      return selectPriority(candidates);
    case 'cheapest':
      return selectCheapest(candidates);
    case 'fastest':
      return selectFastest(candidates);
    case 'balanced':
      return selectBalanced(candidates);
    case 'auto':
      return selectAuto(candidates, request);
    default:
      return selectBalanced(candidates);
  }
}

function buildReasoning(mode: string, primary: RoutingCandidate | null, scores: RoutingScores, filteredCount: number): string {
  const parts = [`mode=${mode}`];
  if (primary) {
    parts.push(`selected=${primary.model.id}@${primary.provider.id}`);
    parts.push(`score=${scores.total.toFixed(2)}`);
    parts.push(`quality=${scores.quality.toFixed(2)} cost=${scores.costEfficiency.toFixed(2)} reliability=${scores.reliability.toFixed(2)}`);
  }
  if (filteredCount > 0) {
    parts.push(`filtered=${filteredCount}`);
  }
  return parts.join(' ');
}
