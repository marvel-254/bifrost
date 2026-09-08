import type { RoutingCandidate, StrategyWeights, RoutingScores } from './types';
import type { NormalizedRequest } from '@bifrost/shared';

export function scoreCandidate(
  candidate: RoutingCandidate,
  weights: StrategyWeights,
  request: NormalizedRequest
): RoutingScores {
  const capabilityMatch = computeCapabilityMatch(candidate, request);
  const quality = candidate.qualityScore;
  const reliability = candidate.reliabilityScore;
  const costEfficiency = candidate.costScore;
  const latency = candidate.latencyScore;
  const availability = candidate.availabilityScore;

  const total =
    weights.capabilityMatch * capabilityMatch +
    weights.quality * quality +
    weights.reliability * reliability +
    weights.costEfficiency * costEfficiency +
    weights.latency * latency +
    weights.availability * availability;

  return {
    capabilityMatch,
    quality,
    reliability,
    costEfficiency,
    latency,
    availability,
    total: Math.round(total * 100) / 100,
  };
}

function computeCapabilityMatch(candidate: RoutingCandidate, request: NormalizedRequest): number {
  if (!request.tools && !request.metadata?.agentMode && !request.metadata?.requiresTools) {
    return 1.0;
  }

  const required: string[] = [];
  if (request.tools) required.push('tool_use');
  if (request.metadata?.agentMode) required.push('tool_use');
  if (request.metadata?.requiresTools) required.push('tool_use');

  if (required.length === 0) return 1.0;

  const matchCount = required.filter(cap => candidate.capabilities.includes(cap)).length;
  return matchCount / required.length;
}
