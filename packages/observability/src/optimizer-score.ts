import type {
  RequestTrace,
  OptimizerScore,
  ScoreComponent,
  OptimizerScoreWeights,
  RoutingCandidate,
} from './types';
import type { ProviderHealth } from '@bifrost/shared';

export const DEFAULT_SCORE_WEIGHTS: OptimizerScoreWeights = {
  compression: 0.20,
  cache: 0.15,
  routeEfficiency: 0.20,
  providerHealth: 0.15,
  costEfficiency: 0.15,
  latencyEfficiency: 0.15,
};

export function calculateScore(
  trace: RequestTrace,
  weights: OptimizerScoreWeights = DEFAULT_SCORE_WEIGHTS,
  options: {
    originalTokens?: number;
    bestCandidateScore?: number;
    selectedCandidateScore?: number;
    providerHealth?: ProviderHealth;
    estimatedMinimumCost?: number;
    estimatedMinimumLatencyMs?: number;
    cacheLatencySavedMs?: number;
    compressionTokensSaved?: number;
  } = {}
): OptimizerScore {
  const originalTokens = options.originalTokens ?? trace.request.messages.reduce((sum: number, m: import('@bifrost/shared').NormalizedMessage) => sum + (m.content?.length || 0) / 4, 0);
  const totalTokens = trace.response?.usage?.total_tokens ?? 0;
  const compressionRatio = originalTokens > 0 ? Math.min(1, totalTokens / originalTokens) : 1;
  const compressionScore = Math.max(0, Math.min(1, (1 - compressionRatio) * 2));

  const cacheHit = trace.spans.some(s => s.name === 'cache' && s.attributes.hit === true);
  const cacheScore = cacheHit ? 1 : 0;
  const cacheLatencySaved = options.cacheLatencySavedMs ?? 0;

  const bestScore = options.bestCandidateScore ?? options.selectedCandidateScore ?? 1;
  const selectedScore = options.selectedCandidateScore ?? 1;
  const routeEfficiencyScore = bestScore > 0 ? Math.min(1, selectedScore / bestScore) : 0;

  const healthScore = options.providerHealth
    ? options.providerHealth.successRate
    : 0.85;

  const actualCost = trace.response?.cost ?? 0;
  const minCost = options.estimatedMinimumCost ?? actualCost;
  const costEfficiencyScore = minCost > 0 ? Math.min(1, minCost / Math.max(actualCost, 0.001)) : 1;

  const actualLatency = trace.endTime && trace.startTime ? trace.endTime - trace.startTime : 1000;
  const minLatency = options.estimatedMinimumLatencyMs ?? actualLatency;
  const latencyEfficiencyScore = minLatency > 0 ? Math.min(1, minLatency / Math.max(actualLatency, 1)) : 1;

  const components: ScoreComponent[] = [
    {
      name: 'compression',
      score: Math.round(compressionScore * 100) / 100,
      maxScore: 1,
      weight: weights.compression,
      reasoning: compressionScore > 0.5
        ? `Compression reduced token usage by ${Math.round((1 - compressionRatio) * 100)}%`
        : 'No significant compression applied',
    },
    {
      name: 'cache',
      score: cacheScore,
      maxScore: 1,
      weight: weights.cache,
      reasoning: cacheHit
        ? `Cache hit saved ~${cacheLatencySaved}ms`
        : 'Cache miss — no latency savings',
    },
    {
      name: 'routeEfficiency',
      score: Math.round(routeEfficiencyScore * 100) / 100,
      maxScore: 1,
      weight: weights.routeEfficiency,
      reasoning: routeEfficiencyScore >= 0.9
        ? 'Selected route near optimal'
        : `Selected route scored ${Math.round(routeEfficiencyScore * 100)}% of best candidate`,
    },
    {
      name: 'providerHealth',
      score: Math.round(healthScore * 100) / 100,
      maxScore: 1,
      weight: weights.providerHealth,
      reasoning: healthScore >= 0.95
        ? 'Provider healthy'
        : `Provider health at ${Math.round(healthScore * 100)}%`,
    },
    {
      name: 'costEfficiency',
      score: Math.round(costEfficiencyScore * 100) / 100,
      maxScore: 1,
      weight: weights.costEfficiency,
      reasoning: actualCost <= minCost * 1.1
        ? 'Cost near minimum estimate'
        : `Actual cost $${actualCost.toFixed(4)} vs min $${minCost.toFixed(4)}`,
    },
    {
      name: 'latencyEfficiency',
      score: Math.round(latencyEfficiencyScore * 100) / 100,
      maxScore: 1,
      weight: weights.latencyEfficiency,
      reasoning: actualLatency <= minLatency * 1.2
        ? 'Latency near minimum estimate'
        : `Actual latency ${actualLatency}ms vs min ${minLatency}ms`,
    },
  ];

  const overall = components.reduce((sum: number, c: ScoreComponent) => sum + c.score * c.weight, 0);

  return {
    overall: Math.round(overall * 100) / 100,
    components,
    weights,
  };
}
