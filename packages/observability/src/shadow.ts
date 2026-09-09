import type { NormalizedRequest, RoutingCandidate, ShadowConfig, ShadowResult, ShadowCandidateResult } from './types';

export interface ShadowBudget {
  requestsThisMinute: number;
  costThisMinute: number;
}

let budget: ShadowBudget = { requestsThisMinute: 0, costThisMinute: 0 };

export function resetShadowBudget(): void {
  budget = { requestsThisMinute: 0, costThisMinute: 0 };
}

export function shouldShadow(request: NormalizedRequest, config: ShadowConfig): boolean {
  if (!config.enabled) return false;

  const hash = hashCode(request.model + JSON.stringify(request.messages || []) + (request.user || ''));
  if (hash % 100 >= config.percentage) return false;

  if (budget.requestsThisMinute >= config.maxRequestsPerMinute) return false;
  if (budget.costThisMinute >= config.maxCostPerMinute) return false;

  return true;
}

export function consumeShadowBudget(latencyMs: number, estimatedCost: number): void {
  budget.requestsThisMinute += 1;
  budget.costThisMinute += estimatedCost;
}

export async function executeShadow(
  request: NormalizedRequest,
  shadowCandidates: RoutingCandidate[],
  options: {
    actualProvider: string;
    actualModel: string;
    actualLatencyMs: number;
    actualTokens: number;
    actualCost: number;
    actualSuccess: boolean;
    actualQualityScore: number;
    actualError?: string;
  }
): Promise<ShadowResult> {
  const traceId = `shadow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = Date.now();

  const productionResult = {
    provider: options.actualProvider,
    model: options.actualModel,
    latencyMs: options.actualLatencyMs,
    tokensUsed: options.actualTokens,
    cost: options.actualCost,
    success: options.actualSuccess,
    qualityScore: options.actualQualityScore,
  };

  const shadowResults: ShadowCandidateResult[] = shadowCandidates.map(candidate => {
    const shadowLatency = simulateLatency(candidate, options.actualLatencyMs);
    const shadowTokens = simulateTokens(candidate, options.actualTokens);
    const shadowCost = estimateShadowCost(candidate, shadowTokens);
    const success = simulateSuccess(candidate);
    const qualityScore = simulateQuality(candidate);

    return {
      provider: candidate.provider.id,
      model: candidate.model.id,
      strategy: 'shadow',
      latencyMs: shadowLatency,
      tokensUsed: shadowTokens,
      cost: shadowCost,
      success,
      qualityScore,
      toolSuccess: success && candidate.capabilities.includes('tools'),
    };
  });

  const comparison = computeComparison(productionResult, shadowResults);

  return {
    requestId: (request.metadata?.request_id as string) || traceId,
    traceId,
    timestamp,
    productionResult,
    shadowResults,
    comparison,
  };
}

export function computeComparison(
  production: { latencyMs: number; cost: number; qualityScore: number; tokensUsed: number; success: boolean },
  shadows: ShadowCandidateResult[]
) {
  const betterShadows = shadows.filter(s => s.success);
  const avgShadowLatency = betterShadows.length > 0
    ? betterShadows.reduce((sum: number, s: ShadowCandidateResult) => sum + s.latencyMs, 0) / betterShadows.length
    : production.latencyMs;
  const avgShadowCost = betterShadows.length > 0
    ? betterShadows.reduce((sum: number, s: ShadowCandidateResult) => sum + s.cost, 0) / betterShadows.length
    : production.cost;
  const avgShadowQuality = betterShadows.length > 0
    ? betterShadows.reduce((sum: number, s: ShadowCandidateResult) => sum + s.qualityScore, 0) / betterShadows.length
    : production.qualityScore;
  const avgShadowTokens = betterShadows.length > 0
    ? betterShadows.reduce((sum: number, s: ShadowCandidateResult) => sum + s.tokensUsed, 0) / betterShadows.length
    : production.tokensUsed;
  const shadowErrors = shadows.filter(s => !s.success).length;

  return {
    latencyDeltaMs: avgShadowLatency - production.latencyMs,
    costDelta: avgShadowCost - production.cost,
    qualityDelta: avgShadowQuality - production.qualityScore,
    tokenDelta: avgShadowTokens - production.tokensUsed,
    errorDelta: shadowErrors - (production.success ? 0 : 1),
  };
}

function simulateLatency(candidate: RoutingCandidate, baseLatency: number): number {
  const variance = 0.8 + Math.random() * 0.4;
  return Math.round(baseLatency * variance * (1 - candidate.latencyScore * 0.3));
}

function simulateTokens(candidate: RoutingCandidate, baseTokens: number): number {
  const variance = 0.9 + Math.random() * 0.2;
  return Math.round(baseTokens * variance);
}

function estimateShadowCost(candidate: RoutingCandidate, tokens: number): number {
  const inputPrice = candidate.model.inputPrice || 0.00001;
  const outputPrice = candidate.model.outputPrice || 0.00002;
  return tokens * (inputPrice + outputPrice) * 0.5;
}

function simulateSuccess(candidate: RoutingCandidate): boolean {
  const successProbability = candidate.reliabilityScore * 0.9 + 0.1;
  return Math.random() < successProbability;
}

function simulateQuality(candidate: RoutingCandidate): number {
  return Math.min(1, candidate.qualityScore + (Math.random() * 0.2 - 0.1));
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
