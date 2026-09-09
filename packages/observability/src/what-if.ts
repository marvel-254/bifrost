import type {
  NormalizedRequest,
  BenchmarkDataset,
  WhatIfConfig,
  WhatIfResult,
  RoutingCandidate,
} from './types';

export function simulate(config: WhatIfConfig, dataset: BenchmarkDataset): WhatIfResult {
  const startTime = Date.now();
  let totalCost = 0;
  let totalLatency = 0;
  const providerDistribution: Record<string, number> = {};
  let fallbackCount = 0;
  let failureCount = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let compressionSavings = 0;
  const qualityScores: number[] = [];

  const requests = dataset.requests;
  const compressionRatio = getCompressionRatio(config.compressionLevel);
  let totalTokens = 0;

  for (const req of requests) {
    const promptTokens = estimatePromptTokens(req);
    const completionTokens = estimateCompletionTokens(req);
    totalPromptTokens += promptTokens;
    totalCompletionTokens += completionTokens;
    compressionSavings += promptTokens * (1 - compressionRatio);
    totalTokens += promptTokens + completionTokens;

    const candidate = selectCandidate(req, config);
    if (!candidate) {
      failureCount++;
      continue;
    }

    const cost = estimateCost(candidate, promptTokens, completionTokens);
    const latency = estimateLatency(candidate, req);
    const quality = estimateQuality(candidate, config);

    totalCost += cost;
    totalLatency += latency;
    providerDistribution[candidate.provider.id] = (providerDistribution[candidate.provider.id] || 0) + 1;
    qualityScores.push(quality);

    if (shouldFallback(req, config)) {
      fallbackCount++;
    }
  }

  const requestCount = requests.length;
  const avgLatency = requestCount > 0 ? totalLatency / requestCount : 0;
  const avgQuality = qualityScores.length > 0 ? qualityScores.reduce((a: number, b: number) => a + b, 0) / qualityScores.length : 0;

  const warnings: string[] = [];
  if (totalCost > 1000) warnings.push('High estimated cost — review cost limits');
  if (fallbackCount / requestCount > 0.3) warnings.push('High fallback frequency — review provider availability');
  if (failureCount / requestCount > 0.1) warnings.push('High failure rate — review constraints');
  if (compressionSavings / totalTokens > 0.5) warnings.push('Aggressive compression may impact quality');

  const result: WhatIfResult = {
    config,
    datasetId: dataset.id,
    estimatedCost: Math.round(totalCost * 100) / 100,
    estimatedLatencyMs: Math.round(avgLatency),
    providerDistribution,
    fallbackFrequency: requestCount > 0 ? Math.round((fallbackCount / requestCount) * 1000) / 10 : 0,
    failureRate: requestCount > 0 ? Math.round((failureCount / requestCount) * 1000) / 10 : 0,
    tokenConsumption: {
      promptTokens: Math.round(totalPromptTokens),
      completionTokens: Math.round(totalCompletionTokens),
      totalTokens: Math.round(totalTokens),
    },
    compressionSavings: Math.round(compressionSavings),
    qualityEstimate: Math.round(avgQuality * 100) / 100,
    requestCount,
    warnings,
  };

  return result;
}

export function compareWithBaseline(
  proposed: WhatIfResult,
  baseline: WhatIfResult
): WhatIfResult['comparison'] {
  const costDelta = baseline.estimatedCost > 0
    ? ((proposed.estimatedCost - baseline.estimatedCost) / baseline.estimatedCost) * 100
    : 0;
  const latencyDelta = baseline.estimatedLatencyMs > 0
    ? ((proposed.estimatedLatencyMs - baseline.estimatedLatencyMs) / baseline.estimatedLatencyMs) * 100
    : 0;

  return {
    baselineCost: baseline.estimatedCost,
    baselineLatencyMs: baseline.estimatedLatencyMs,
    costDeltaPercent: Math.round(costDelta * 100) / 100,
    latencyDeltaPercent: Math.round(latencyDelta * 100) / 100,
  };
}

function getCompressionRatio(level?: string): number {
  if (!level || level === 'off') return 1.0;
  if (level === 'safe') return 0.92;
  if (level === 'balanced') return 0.85;
  if (level === 'aggressive') return 0.70;
  if (level === 'auto') return 0.88;
  return 1.0;
}

function estimatePromptTokens(req: NormalizedRequest): number {
  return req.messages.reduce((sum: number, m: import('@bifrost/shared').NormalizedMessage) => sum + (m.content?.length || 0) / 4, 0);
}

function estimateCompletionTokens(req: NormalizedRequest): number {
  return (req.max_tokens || 1024) * 0.7;
}

function estimateCost(candidate: RoutingCandidate, promptTokens: number, completionTokens: number): number {
  const inputPrice = candidate.model.inputPrice || 0.00001;
  const outputPrice = candidate.model.outputPrice || 0.00002;
  return (promptTokens * inputPrice + completionTokens * outputPrice);
}

function estimateLatency(candidate: RoutingCandidate, req: NormalizedRequest): number {
  const base = req.stream ? 800 : 2000;
  return Math.round(base * (1.2 - candidate.latencyScore * 0.4));
}

function estimateQuality(candidate: RoutingCandidate, config: WhatIfConfig): number {
  let score = candidate.qualityScore * 0.7 + 0.3;
  if (config.cachePolicy?.enabled) score += 0.05;
  if (config.compressionLevel === 'off') score += 0.05;
  return Math.min(1, score);
}

function selectCandidate(req: NormalizedRequest, config: WhatIfConfig): RoutingCandidate | null {
  const quality = config.routingWeights?.quality ? 0.8 : 0.5;
  return {
    model: { id: req.model, provider: 'simulated', displayName: 'Simulated', contextWindow: 8192, capabilities: [], enabled: true },
    provider: { id: 'simulated-provider', name: 'Simulated', enabled: true },
    capabilities: req.tools?.map(t => t.function.name) || [],
    qualityScore: quality,
    costScore: 0.7,
    latencyScore: 0.8,
    reliabilityScore: 0.9,
    availabilityScore: 1,
    priority: 1,
  };
}

function shouldFallback(req: NormalizedRequest, config: WhatIfConfig): boolean {
  if (config.policyConstraints?.maxCostPerRequest && (req.metadata?.estimated_cost as number || 0) > config.policyConstraints.maxCostPerRequest) {
    return true;
  }
  return Math.random() < 0.05;
}
