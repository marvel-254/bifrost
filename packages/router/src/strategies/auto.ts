import type { NormalizedRequest } from '@bifrost/shared';
import type { ScoredCandidate } from '../types';
import type { StrategyResult } from './manual';
import { selectCheapest } from './cheapest';
import { selectFastest } from './fastest';
import { selectPriority } from './priority';
import { selectManual } from './manual';
import { selectBalanced } from './balanced';

export function selectAuto(candidates: ScoredCandidate[], request: NormalizedRequest): StrategyResult {
  const mode = classifyRequest(request);
  switch (mode) {
    case 'cheapest':
      return selectCheapest(candidates);
    case 'fastest':
      return selectFastest(candidates);
    case 'priority':
      return selectPriority(candidates);
    case 'manual':
      return selectManual(candidates, request);
    case 'balanced':
    default:
      return selectBalanced(candidates);
  }
}

function classifyRequest(_request: NormalizedRequest): string {
  return 'balanced';
}
