export interface RoutingRule {
  id: string;
  name: string;
  strategy: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface RoutingWeight {
  factor: string;
  weight: number;
}

export interface RoutingModelWeight {
  provider: string;
  model: string;
  priorityScore: number;
  costOverride: number | null;
  latencyOverride: number | null;
}

export interface ProviderHealthRecord {
  id: string;
  provider: string;
  model: string;
  healthy: boolean;
  latencyMs: number | null;
  error: string | null;
  checkedAt: Date;
}

export interface MetricsSummary {
  provider: string;
  model: string;
  requestCount: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalTokens: number;
  totalCost: number;
  totalLatencyMs: number;
  errorCount: number;
}

// ── SQL query fragments (parameterized) ────────────────────────────────────

export const routingRulesQuery = `
  SELECT id, name, strategy, config, enabled
  FROM routing_rules
  WHERE enabled = true
  ORDER BY name
`;

export const routingWeightsQuery = `
  SELECT factor, weight
  FROM routing_weights
  WHERE rule_id = $1
`;

export const routingModelWeightsQuery = `
  SELECT provider, model, priority_score, cost_override, latency_override
  FROM routing_model_weights
  WHERE rule_id = $1
`;

export const providerHealthQuery = `
  SELECT id, provider, model, healthy, latency_ms, error, checked_at
  FROM provider_health
  WHERE provider = $1
  ORDER BY checked_at DESC
`;

export const requestLogsQuery = `
  SELECT id, request_id, strategy, provider, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, estimated_cost, created_at
  FROM request_logs
`;

export const metricsSummaryQuery = `
  SELECT provider, model, request_count, total_prompt_tokens, total_completion_tokens, total_tokens, total_cost, total_latency_ms, error_count
  FROM metrics_summaries
  WHERE period_start >= $1 AND period_end <= $2
  ORDER BY provider, model
`;
