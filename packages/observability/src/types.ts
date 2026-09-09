export type { NormalizedRequest, NormalizedResponse } from '@bifrost/shared';
export type { RoutingCandidate } from '@bifrost/routing';
export type { ProviderHealth } from '@bifrost/shared';

export interface SpanEvent {
  name: string;
  timestamp: number;
  attributes?: Record<string, unknown>;
}

export interface SpanAttributes {
  [key: string]: unknown;
}

export interface Span {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime: number;
  attributes: SpanAttributes;
  events: SpanEvent[];
  status: 'ok' | 'error';
  errorMessage?: string;
}

export interface RequestTrace {
  traceId: string;
  requestId: string;
  startTime: number;
  endTime?: number;
  request: import('@bifrost/shared').NormalizedRequest;
  response?: import('@bifrost/shared').NormalizedResponse;
  spans: Span[];
  attributes: SpanAttributes;
  tags: string[];
  tenant?: string;
  application?: string;
  provider?: string;
  model?: string;
  strategy?: string;
  status: 'started' | 'completed' | 'failed';
  error?: string;
}

export interface ScoreComponent {
  name: string;
  score: number;
  maxScore: number;
  weight: number;
  reasoning: string;
}

export interface OptimizerScore {
  overall: number;
  components: ScoreComponent[];
  weights: {
    compression: number;
    cache: number;
    routeEfficiency: number;
    providerHealth: number;
    costEfficiency: number;
    latencyEfficiency: number;
  };
}

export interface OptimizerScoreWeights {
  compression: number;
  cache: number;
  routeEfficiency: number;
  providerHealth: number;
  costEfficiency: number;
  latencyEfficiency: number;
}

export interface ShadowConfig {
  enabled: boolean;
  percentage: number;
  maxRequestsPerMinute: number;
  maxCostPerMinute: number;
  alternativeStrategies: string[];
  providers: string[];
}

export interface ShadowCandidateResult {
  provider: string;
  model: string;
  strategy: string;
  latencyMs: number;
  tokensUsed: number;
  cost: number;
  success: boolean;
  error?: string;
  qualityScore: number;
  toolSuccess?: boolean;
}

export interface ShadowResult {
  requestId: string;
  traceId: string;
  timestamp: number;
  productionResult: {
    provider: string;
    model: string;
    latencyMs: number;
    tokensUsed: number;
    cost: number;
    success: boolean;
    qualityScore: number;
  };
  shadowResults: ShadowCandidateResult[];
  comparison: {
    latencyDeltaMs: number;
    costDelta: number;
    qualityDelta: number;
    tokenDelta: number;
    errorDelta: number;
  };
}

export interface ShadowBudget {
  requestsThisMinute: number;
  costThisMinute: number;
}

export interface BenchmarkDataset {
  id: string;
  name: string;
  description?: string;
  requests: import('@bifrost/shared').NormalizedRequest[];
  createdAt: number;
  createdBy?: string;
  privacy: {
    redactPII: boolean;
    excludedFields: string[];
    tenantConsent: boolean;
  };
}

export interface BenchmarkConfig {
  strategy?: string;
  model?: string;
  compressionLevel?: string;
  providers?: string[];
  compareWith?: string;
  sampleSize?: number;
  shuffle: boolean;
}

export interface BenchmarkResult {
  datasetId: string;
  config: BenchmarkConfig;
  startedAt: number;
  completedAt: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: {
    avgLatencyMs: number;
    avgCost: number;
    avgTokens: number;
    avgQuality: number;
    totalCost: number;
    totalTokens: number;
    providerDistribution: Record<string, number>;
    fallbackCount: number;
    errorCount: number;
  };
  comparison?: {
    baselineConfig: string;
    baselineMetrics: {
      avgLatencyMs: number;
      avgCost: number;
      avgTokens: number;
      avgQuality: number;
    };
    deltas: {
      latencyDeltaPercent: number;
      costDeltaPercent: number;
      tokenDeltaPercent: number;
      qualityDeltaPercent: number;
    };
  };
}

export interface WhatIfConfig {
  name: string;
  routingWeights?: {
    capabilityMatch?: number;
    quality?: number;
    reliability?: number;
    costEfficiency?: number;
    latency?: number;
    availability?: number;
  };
  compressionLevel?: string;
  cachePolicy?: { enabled: boolean; ttlSeconds?: number };
  disabledProviders?: string[];
  disabledModels?: string[];
  policyConstraints?: {
    maxCostPerRequest?: number;
    maxLatencyMs?: number;
    requiredCapabilities?: string[];
  };
}

export interface WhatIfResult {
  config: WhatIfConfig;
  datasetId: string;
  estimatedCost: number;
  estimatedLatencyMs: number;
  providerDistribution: Record<string, number>;
  fallbackFrequency: number;
  failureRate: number;
  tokenConsumption: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  compressionSavings: number;
  qualityEstimate: number;
  requestCount: number;
  warnings: string[];
  comparison?: {
    baselineCost: number;
    baselineLatencyMs: number;
    costDeltaPercent: number;
    latencyDeltaPercent: number;
  };
}

export interface DashboardFilters {
  tenant?: string;
  application?: string;
  provider?: string;
  model?: string;
  route?: string;
  startTime?: number;
  endTime?: number;
  tag?: string;
  limit?: number;
  offset?: number;
}

export interface TraceExport {
  format: 'json' | 'otlp';
  traces: RequestTrace[];
}

export type PIIField = 'user' | 'metadata.client_ip' | 'metadata.email' | 'metadata.name' | 'metadata.phone';

export interface DbRequestTrace {
  id: string;
  request_id: string;
  trace_id: string;
  tenant?: string;
  application?: string;
  provider?: string;
  model?: string;
  strategy?: string;
  status: string;
  start_time: string;
  end_time?: string;
  error?: string;
  tags: string[];
  attributes: Record<string, unknown>;
  created_at: string;
}

export interface DbTraceSpan {
  id: string;
  trace_id: string;
  request_id: string;
  parent_span_id?: string;
  name: string;
  start_time: string;
  end_time: string;
  attributes: Record<string, unknown>;
  events: Record<string, unknown>[];
  status: string;
  error_message?: string;
}

export interface DbOptimizerScore {
  id: string;
  trace_id: string;
  request_id: string;
  overall: number;
  components: Record<string, unknown>;
  weights: Record<string, number>;
  created_at: string;
}

export interface DbShadowResult {
  id: string;
  request_id: string;
  trace_id: string;
  production_provider: string;
  production_model: string;
  production_latency_ms: number;
  production_cost: number;
  production_success: boolean;
  shadow_results: Record<string, unknown>[];
  comparison: Record<string, unknown>;
  created_at: string;
}

export interface DbBenchmarkDataset {
  id: string;
  name: string;
  description?: string;
  request_count: number;
  privacy: Record<string, unknown>;
  created_by?: string;
  created_at: string;
}

export interface DbBenchmarkResult {
  id: string;
  dataset_id: string;
  config: Record<string, unknown>;
  started_at: string;
  completed_at: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  metrics: Record<string, unknown>;
  comparison?: Record<string, unknown>;
}

export interface DbWhatIfSimulation {
  id: string;
  name: string;
  config: Record<string, unknown>;
  dataset_id: string;
  result: Record<string, unknown>;
  created_at: string;
}
