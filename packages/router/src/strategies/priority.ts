import type { RoutingCandidate, ScoredCandidate } from '../types';
import type { StrategyResult } from './manual';

export function selectPriority(candidates: ScoredCandidate[]): StrategyResult {
  if (candidates.length === 0) {
    return { primary: null, fallbacks: [] };
  }

  const sorted = [...candidates].sort((a, b) => b.candidate.priority - a.candidate.priority);
  return {
    primary: sorted[0].candidate,
    fallbacks: sorted.slice(1, 3).map(s => s.candidate),
  };
}
