import type { RoutingCandidate, HardConstraints } from './types';
import type { NormalizedRequest } from '@bifrost/shared';

export interface FilterResult {
  candidate: RoutingCandidate;
  passed: boolean;
  reasons: string[];
}

export function filterCandidates(
  candidates: RoutingCandidate[],
  constraints: HardConstraints,
  request: NormalizedRequest
): FilterResult[] {
  const requiredCaps = new Set(constraints.requiredCapabilities);
  const disabledProviders = new Set(constraints.disabledProviders);
  const disabledModels = new Set(constraints.disabledModels);

  return candidates.map(candidate => {
    const reasons: string[] = [];

    if (!candidate.provider.enabled) {
      reasons.push(`Provider "${candidate.provider.id}" is disabled`);
    }

    if (disabledProviders.has(candidate.provider.id)) {
      reasons.push(`Provider "${candidate.provider.id}" is disabled by user restrictions`);
    }

    if (disabledModels.has(candidate.model.id)) {
      reasons.push(`Model "${candidate.model.id}" is disabled by user restrictions`);
    }

    if (candidate.model.contextWindow < constraints.minContextWindow) {
      reasons.push(`Model context ${candidate.model.contextWindow} < required ${constraints.minContextWindow}`);
    }

    for (const cap of requiredCaps) {
      if (!candidate.capabilities.includes(cap)) {
        reasons.push(`Model "${candidate.model.id}" missing capability: ${cap}`);
      }
    }

    if (constraints.budget !== undefined && constraints.budget > 0) {
      const estimatedCost = estimateCandidateCost(candidate, request);
      if (estimatedCost > constraints.budget) {
        reasons.push(`Estimated cost $${estimatedCost.toFixed(4)} exceeds budget $${constraints.budget.toFixed(4)}`);
      }
    }

    for (const restriction of constraints.userRestrictions) {
      if (candidate.provider.id === restriction || candidate.model.id === restriction) {
        reasons.push(`Restricted by user policy: ${restriction}`);
      }
    }

    return {
      candidate,
      passed: reasons.length === 0,
      reasons,
    };
  });
}

function estimateCandidateCost(candidate: RoutingCandidate, request: NormalizedRequest): number {
  const inputPrice = candidate.model.inputPrice ?? 0;
  const outputPrice = candidate.model.outputPrice ?? 0;
  const inputTokens = estimateInputTokens(request);
  const estimatedOutputTokens = inputTokens * 0.5;

  return (inputTokens / 1000) * inputPrice + (estimatedOutputTokens / 1000) * outputPrice;
}

function estimateInputTokens(request: NormalizedRequest): number {
  const inputTokens = request.metadata?.inputTokens as number | undefined;
  if (inputTokens !== undefined) {
    return inputTokens;
  }

  let tokens = 0;
  for (const message of request.messages) {
    tokens += message.content.length / 4;
  }

  if (request.tools) {
    tokens += request.tools.length * 100;
  }

  return Math.max(tokens, 100);
}
