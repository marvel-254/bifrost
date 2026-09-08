import { NeonQueryFunction } from '@neondatabase/serverless';

/**
 * Bifröst database schema
 * Target: Neon Serverless Postgres
 * Migration order (top to bottom) — run sequentially.
 *
 * Version: 2026-09-08
 */

-- ── Extension ──────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Routing configuration ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routing_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  strategy    TEXT NOT NULL CHECK (
                  strategy IN (
                    'manual','priority','cheapest','fastest','balanced',
                    'cost_aware','latency_aware','quality_aware'
                  )
                ),
  config      JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE routing_rules IS
'Active routing strategy + its JSON config. One row per strategy.';

CREATE TABLE IF NOT EXISTS routing_weights (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        UUID NOT NULL REFERENCES routing_rules(id) ON DELETE CASCADE,
  factor         TEXT NOT NULL,
  weight         DOUBLE PRECISION NOT NULL CHECK (weight >= 0 AND weight <= 1),
  UNIQUE (rule_id, factor)
);

COMMENT ON TABLE routing_weights IS
'Soft-scoring weights per routing rule. Weights across factors for one rule should sum to ≤ 1.';

CREATE TABLE IF NOT EXISTS routing_model_weights (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id          UUID NOT NULL REFERENCES routing_rules(id) ON DELETE CASCADE,
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  priority_score   DOUBLE PRECISION NOT NULL DEFAULT 50.0 CHECK (priority_score >= 0 AND priority_score <= 100),
  cost_override    DOUBLE PRECISION,
  latency_override DOUBLE PRECISION,
  UNIQUE (rule_id, provider, model)
);

COMMENT ON TABLE routing_model_weights IS
'Per-model overrides for a routing rule (priority, custom cost, custom latency).';

-- ── Provider health ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS provider_health (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider    TEXT NOT NULL,
  model       TEXT NOT NULL DEFAULT '',
  healthy     BOOLEAN NOT NULL DEFAULT false,
  latency_ms  INTEGER,
  error       TEXT,
  checked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, model)
);

CREATE INDEX IF NOT EXISTS idx_provider_health_provider
  ON provider_health(provider);

COMMENT ON TABLE provider_health IS
'Latest health-check result per provider+model. Updated by the health-check cron.';

-- ── Fallback chain ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routing_fallbacks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy      TEXT NOT NULL,
  original_model  TEXT NOT NULL,
  fallback_model TEXT NOT NULL REFERENCES routing_rules(id),
  retry_after_ms  INTEGER NOT NULL DEFAULT 5000,
  max_attempts    INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1 AND max_attempts <= 10),
  enabled        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE routing_fallbacks IS
'Fallback mapping: when strategy X fails on original_model, retry with fallback_model up to max_attempts times.';

-- ── Request logs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS request_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          TEXT NOT NULL,
  project_id          TEXT NOT NULL DEFAULT 'default',
  user_id             TEXT,
  strategy            TEXT NOT NULL,
  provider            TEXT NOT NULL,
  model               TEXT NOT NULL,
  status              TEXT NOT NULL CHECK (
                          status IN (
                            'ok','error','rate_limited','timeout','provider_error',
                            'auth_error','validation_error','routing_error'
                          )
                        ),
  prompt_tokens       INTEGER NOT NULL DEFAULT 0,
  completion_tokens   INTEGER NOT NULL DEFAULT 0,
  total_tokens        INTEGER NOT NULL DEFAULT 0,
  latency_ms          INTEGER,
  estimated_cost      DOUBLE PRECISION,
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_provider
  ON request_logs(provider);
CREATE INDEX IF NOT EXISTS idx_request_logs_model
  ON request_logs(model);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at
  ON request_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_logs_request_id
  ON request_logs(request_id);

COMMENT ON TABLE request_logs IS
'Normalized log of every completed/failed request. One row per request.';

-- ── Metrics summaries (rolled up) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS metrics_summaries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start     TIMESTAMPTZ NOT NULL,
  period_end       TIMESTAMPTZ NOT NULL,
  provider         TEXT NOT NULL,
  model            TEXT NOT NULL,
  request_count    INTEGER NOT NULL DEFAULT 0,
  total_prompt_tokens    INTEGER NOT NULL DEFAULT 0,
  total_completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens     INTEGER NOT NULL DEFAULT 0,
  total_cost       DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_latency_ms INTEGER NOT NULL DEFAULT 0,
  error_count      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (period_start, period_end, provider, model)
);

COMMENT ON TABLE metrics_summaries IS
'Hourly/daily roll-up of request_logs for fast dashboard queries.';

-- ── Telemetry Proto v1 notes ────────────────────────────────────────────────
--
-- Request logging flow:
--   1. Route resolves to (provider, model, strategy).
--   2. Provider call runs.
--   3. On completion (success or failure) insert into request_logs.
--   4. Hourly cron/lambda aggregates into metrics_summaries.
--   5. Dashboard reads metrics_summaries (last 24h) + request_logs (realtime).
--
-- Cost is estimated at route time from provider.estimateCost()
-- and stored in request_logs.estimated_cost. Provider adapter is
-- the source of truth for cost per token.
