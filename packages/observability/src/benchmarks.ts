import type {
  NormalizedRequest,
  NormalizedResponse,
  BenchmarkDataset,
  BenchmarkConfig,
  BenchmarkResult,
  RoutingCandidate,
} from './types';

const PII_FIELDS: string[] = ['user', 'metadata.client_ip', 'metadata.email', 'metadata.name', 'metadata.phone'];

export function createDataset(
  name: string,
  requests: NormalizedRequest[],
  options?: {
    description?: string;
    createdBy?: string;
    privacy?: {
      redactPII?: boolean;
      excludedFields?: string[];
      tenantConsent?: boolean;
    };
  }
): BenchmarkDataset {
  const redacted = options?.privacy?.redactPII
    ? requests.map(redactPII)
    : requests.map(r => ({ ...r }));

  const excluded = options?.privacy?.excludedFields || [];
  const filtered = excluded.length > 0
    ? redacted.map(r => excludeFields(r, excluded))
    : redacted;

  return {
    id: `ds_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    description: options?.description,
    requests: filtered,
    createdAt: Date.now(),
    createdBy: options?.createdBy,
    privacy: {
      redactPII: options?.privacy?.redactPII ?? true,
      excludedFields: excluded,
      tenantConsent: options?.privacy?.tenantConsent ?? false,
    },
  };
}

export async function runBenchmark(
  dataset: BenchmarkDataset,
  config: BenchmarkConfig,
  options?: {
    simulateRequest?: (request: NormalizedRequest, config: BenchmarkConfig) => Promise<NormalizedResponse & { candidate: RoutingCandidate; latencyMs: number; success: boolean; error?: string }>;
  }
): Promise<BenchmarkResult> {
  const startTime = Date.now();
  const totalRequests = config.sampleSize ? Math.min(config.sampleSize, dataset.requests.length) : dataset.requests.length;
  let requests = config.shuffle ? shuffle([...dataset.requests]).slice(0, totalRequests) : dataset.requests.slice(0, totalRequests);

  let successfulRequests = 0;
  let failedRequests = 0;
  let totalLatency = 0;
  let totalCost = 0;
  let totalTokens = 0;
  let totalQuality = 0;
  const providerDistribution: Record<string, number> = {};
  let fallbackCount = 0;
  let errorCount = 0;

  for (const req of requests) {
    try {
      if (options?.simulateRequest) {
        const result = await options.simulateRequest(req, config);
        if (result.success) {
          successfulRequests++;
          totalLatency += result.latencyMs;
          totalCost += result.candidate.model.inputPrice ? result.latencyMs * 0.001 : 0.01;
          totalTokens += result.usage?.total_tokens || 0;
          totalQuality += result.candidate.qualityScore;
          providerDistribution[result.candidate.provider.id] = (providerDistribution[result.candidate.provider.id] || 0) + 1;
        } else {
          failedRequests++;
          errorCount++;
        }
      } else {
        successfulRequests++;
        totalTokens += estimateTokens(req);
        totalLatency += 500 + Math.random() * 1500;
        totalCost += 0.01;
        totalQuality += 0.7 + Math.random() * 0.3;
        providerDistribution['simulated'] = (providerDistribution['simulated'] || 0) + 1;
      }
    } catch {
      failedRequests++;
      errorCount++;
    }
  }

  const completedAt = Date.now();
  const avgLatency = successfulRequests > 0 ? totalLatency / successfulRequests : 0;
  const avgCost = successfulRequests > 0 ? totalCost / successfulRequests : 0;
  const avgTokens = successfulRequests > 0 ? totalTokens / successfulRequests : 0;
  const avgQuality = successfulRequests > 0 ? totalQuality / successfulRequests : 0;

  return {
    datasetId: dataset.id,
    config,
    startedAt: startTime,
    completedAt,
    totalRequests,
    successfulRequests,
    failedRequests,
    metrics: {
      avgLatencyMs: Math.round(avgLatency),
      avgCost: Math.round(avgCost * 10000) / 10000,
      avgTokens: Math.round(avgTokens),
      avgQuality: Math.round(avgQuality * 100) / 100,
      totalCost: Math.round(totalCost * 10000) / 10000,
      totalTokens,
      providerDistribution,
      fallbackCount,
      errorCount,
    },
  };
}

export function compareBenchmarks(
  baseline: BenchmarkResult,
  proposed: BenchmarkResult
): BenchmarkResult['comparison'] {
  const costDelta = baseline.metrics.totalCost > 0
    ? ((proposed.metrics.totalCost - baseline.metrics.totalCost) / baseline.metrics.totalCost) * 100
    : 0;
  const latencyDelta = baseline.metrics.avgLatencyMs > 0
    ? ((proposed.metrics.avgLatencyMs - baseline.metrics.avgLatencyMs) / baseline.metrics.avgLatencyMs) * 100
    : 0;
  const tokenDelta = baseline.metrics.totalTokens > 0
    ? ((proposed.metrics.totalTokens - baseline.metrics.totalTokens) / baseline.metrics.totalTokens) * 100
    : 0;
  const qualityDelta = baseline.metrics.avgQuality > 0
    ? ((proposed.metrics.avgQuality - baseline.metrics.avgQuality) / baseline.metrics.avgQuality) * 100
    : 0;

  return {
    baselineConfig: JSON.stringify(baseline.config),
    baselineMetrics: {
      avgLatencyMs: baseline.metrics.avgLatencyMs,
      avgCost: baseline.metrics.avgCost,
      avgTokens: baseline.metrics.avgTokens,
      avgQuality: baseline.metrics.avgQuality,
    },
    deltas: {
      latencyDeltaPercent: Math.round(latencyDelta * 100) / 100,
      costDeltaPercent: Math.round(costDelta * 100) / 100,
      tokenDeltaPercent: Math.round(tokenDelta * 100) / 100,
      qualityDeltaPercent: Math.round(qualityDelta * 100) / 100,
    },
  };
}

function redactPII(request: NormalizedRequest): NormalizedRequest {
  const redacted: any = { ...request };
  if (typeof redacted.user === 'string') {
    redacted.user = '[REDACTED]';
  }
  if (redacted.metadata) {
    const meta = { ...redacted.metadata };
    for (const field of PII_FIELDS) {
      if (field.startsWith('metadata.')) {
        const key = field.replace('metadata.', '');
        if (key in meta) meta[key] = '[REDACTED]';
      }
    }
    redacted.metadata = meta;
  }
  return redacted as NormalizedRequest;
}

function excludeFields(request: NormalizedRequest, fields: string[]): NormalizedRequest {
  const clone: any = { ...request, metadata: { ...request.metadata } };
  for (const field of fields) {
    if (field === 'user') {
      delete clone.user;
    } else if (field.startsWith('metadata.')) {
      const key = field.replace('metadata.', '');
      delete clone.metadata[key];
    }
  }
  return clone as NormalizedRequest;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function estimateTokens(req: NormalizedRequest): number {
  return req.messages.reduce((sum: number, m: import('@bifrost/shared').NormalizedMessage) => sum + (m.content?.length || 0) / 4, 0);
}
