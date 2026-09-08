import type { NormalizedRequest } from '@bifrost/shared';
import type { RoutingCandidate, RoutingScores, ScoredCandidate, StrategyResult } from '../types';

export type { StrategyResult };

export function selectManual(candidates: ScoredCandidate[], request: NormalizedRequest): StrategyResult {
  const explicitModel = request.model;
  if (!explicitModel) {
    const primary = candidates.find(c => c.candidate.provider.enabled)?.candidate ?? null;
    return { primary, fallbacks: candidates.filter(c => c.candidate !== primary).slice(0, 2).map(s => s.candidate) };
  }

  const match = candidates.find(c => c.candidate.model.id === explicitModel);
  if (match) {
    return { primary: match.candidate, fallbacks: candidates.filter(c => c.candidate !== match.candidate).slice(0, 2).map(s => s.candidate) };
  }

  const byProvider = candidates.find(c => c.candidate.provider.id === explicitModel);
  if (byProvider) {
    return { primary: byProvider.candidate, fallbacks: candidates.filter(c => c.candidate !== byProvider.candidate).slice(0, 2).map(s => s.candidate) };
  }

  return { primary: null, fallbacks: [] };
}
