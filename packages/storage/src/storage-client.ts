import { SqlClient, SqlClientConfig, SqlRow, QueryResult } from './types';
import { routingRulesQuery, routingWeightsQuery, routingModelWeightsQuery, providerHealthQuery, requestLogsQuery, metricsSummaryQuery } from './queries';

/**
 * Storage client wrapping a SQL database connection.
 * Designed to work with:
 *   - Neon Serverless Postgres (production)
 *   - Any libsql/postgres-compatible driver (dev/testing)
 *
 * Not tied to any single driver — swap the underlying connection
 * by passing a compatible SqlClient implementation.
 */
export class StorageClient implements SqlClient {
  private client: SqlClient;
  private config: SqlClientConfig;

  constructor(config: SqlClientConfig) {
    this.config = config;
    // In production this would be initialized from a real driver
    // (e.g. @neondatabase/serverless). For now we store the config
    // and validate it; the actual connection is established lazily
    // by the route handlers that need it.
    if (!config.connectionString) {
      throw new Error('StorageClient requires connectionString');
    }
    this.client = {
      async query<T = SqlRow>(sql: string, params?: unknown[], options?: { timeoutMs?: number }): Promise<QueryResult<T>> {
        // Placeholder — real implementation provided by driver wrapper
        throw new Error('StorageClient.query not implemented — provide a driver');
      },
      async close() {
        // no-op for placeholder
      },
    };
  }

  get connectionString(): string {
    return this.config.connectionString;
  }

  // ── Routing configuration ────────────────────────────────────────────

  async getRoutingRules(): Promise<Array<{ id: string; name: string; strategy: string; config: Record<string, unknown>; enabled: boolean }>> {
    return this.client.query(routingRulesQuery).then(r => r.rows as any);
  }

  async getRoutingRuleById(id: string): Promise<{ id: string; name: string; strategy: string; config: Record<string, unknown>; enabled: boolean } | null> {
    const rows = await this.client.query(routingRulesQuery + ` WHERE id = $1`, [id]);
    return rows.rows.length > 0 ? rows.rows[0] as any : null;
  }

  async getRoutingRuleByName(name: string): Promise<{ id: string; name: string; strategy: string; config: Record<string, unknown>; enabled: boolean } | null> {
    const rows = await this.client.query(routingRulesQuery + ` WHERE name = $1`, [name]);
    return rows.rows.length > 0 ? rows.rows[0] as any : null;
  }

  async setRoutingRule(rule: { name: string; strategy: string; config: Record<string, unknown>; enabled?: boolean }): Promise<void> {
    // Upsert: INSERT ... ON CONFLICT (name) DO UPDATE
    const sql = `
      INSERT INTO routing_rules (name, strategy, config, enabled)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO UPDATE SET
        strategy = EXCLUDED.strategy,
        config   = EXCLUDED.config,
        enabled  = EXCLUDED.enabled,
        updated_at = now()
    `;
    await this.client.query(sql, [rule.name, rule.strategy, JSON.stringify(rule.config), rule.enabled ?? true]);
  }

  // ── Routing weights ───────────────────────────────────────────────────

  async getRoutingWeights(ruleId: string): Promise<Array<{ factor: string; weight: number }>> {
    const rows = await this.client.query(routingWeightsQuery + ` WHERE rule_id = $1`, [ruleId]);
    return rows.rows as any;
  }

  async setRoutingWeight(ruleId: string, factor: string, weight: number): Promise<void> {
    const sql = `
      INSERT INTO routing_weights (rule_id, factor, weight)
      VALUES ($1, $2, $3)
      ON CONFLICT (rule_id, factor) DO UPDATE SET weight = EXCLUDED.weight
    `;
    await this.client.query(sql, [ruleId, factor, weight]);
  }

  async getRoutingModelWeights(ruleId: string): Promise<Array<{ provider: string; model: string; priority_score: number; cost_override: number | null; latency_override: number | null }>> {
    const rows = await this.client.query(routingModelWeightsQuery + ` WHERE rule_id = $1`, [ruleId]);
    return rows.rows as any;
  }

  async setRoutingModelWeight(ruleId: string, provider: string, model: string, priorityScore: number, costOverride?: number, latencyOverride?: number): Promise<void> {
    const sql = `
      INSERT INTO routing_model_weights (rule_id, provider, model, priority_score, cost_override, latency_override)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (rule_id, provider, model) DO UPDATE SET
        priority_score = EXCLUDED.priority_score,
        cost_override  = EXCLUDED.cost_override,
        latency_override = EXCLUDED.latency_override
    `;
    await this.client.query(sql, [ruleId, provider, model, priorityScore, costOverride ?? null, latencyOverride ?? null]);
  }

  // ── Provider health ───────────────────────────────────────────────────

  async getProviderHealth(provider: string): Promise<Array<{ id: string; provider: string; model: string; healthy: boolean; latencyMs: number | null; error: string | null; checkedAt: Date }>> {
    const rows = await this.client.query(providerHealthQuery + ` WHERE provider = $1`, [provider]);
    return rows.rows as any;
  }

  async setProviderHealth(provider: string, model: string, healthy: boolean, latencyMs?: number, error?: string): Promise<void> {
    const sql = `
      INSERT INTO provider_health (provider, model, healthy, latency_ms, error, checked_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (provider, model) DO UPDATE SET
        healthy    = EXCLUDED.healthy,
        latency_ms = EXCLUDED.latency_ms,
        error      = EXCLUDED.error,
        checked_at = now()
    `;
    await this.client.query(sql, [provider, model, healthy, latencyMs ?? null, error ?? null]);
  }

  // ── Request logs ──────────────────────────────────────────────────────

  async logRequest(log: {
    requestId: string;
    projectId?: string;
    userId?: string;
    strategy: string;
    provider: string;
    model: string;
    status: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    latencyMs?: number;
    estimatedCost?: number;
    errorMessage?: string;
  }): Promise<void> {
    const sql = `
      INSERT INTO request_logs (request_id, project_id, user_id, strategy, provider, model, status, prompt_tokens, completion_tokens, total_tokens, latency_ms, estimated_cost, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    `;
    await this.client.query(sql, [
      log.requestId,
      log.projectId ?? 'default',
      log.userId ?? null,
      log.strategy,
      log.provider,
      log.model,
      log.status,
      log.promptTokens,
      log.completionTokens,
      log.totalTokens,
      log.latencyMs ?? null,
      log.estimatedCost ?? null,
      log.errorMessage ?? null,
    ]);
  }

  async getRecentRequestLogs(limit = 100): Promise<Array<{ id: string; requestId: string; strategy: string; provider: string; model: string; status: string; promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number | null; estimatedCost: number | null; createdAt: Date }>> {
    const rows = await this.client.query(requestLogsQuery + ` ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows.rows as any;
  }

  // ── Metrics summaries ─────────────────────────────────────────────────

  async getMetricsSummary(provider: string, model: string, periodStart: Date, periodEnd: Date): Promise<{ requestCount: number; totalPromptTokens: number; totalCompletionTokens: number; totalTokens: number; totalCost: number; totalLatencyMs: number; errorCount: number } | null> {
    const rows = await this.client.query(metricsSummaryQuery + ` WHERE provider = $1 AND model = $2 AND period_start >= $3 AND period_end <= $4`, [provider, model, periodStart, periodEnd]);
    return rows.rows.length > 0 ? rows.rows[0] as any : null;
  }

  async getMetricsSummaries(periodStart: Date, periodEnd: Date): Promise<Array<{ provider: string; model: string; requestCount: number; totalPromptTokens: number; totalCompletionTokens: number; totalTokens: number; totalCost: number; totalLatencyMs: number; errorCount: number }>> {
    const rows = await this.client.query(metricsSummaryQuery + ` WHERE period_start >= $1 AND period_end <= $2`, [periodStart, periodEnd]);
    return rows.rows as any;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────

  async close(): Promise<void> {
    await this.client.close();
  }
}
