-- Phase 8: Observability tables

-- Request traces (full request lifecycle)
CREATE TABLE IF NOT EXISTS request_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  tenant TEXT,
  application TEXT,
  provider TEXT,
  model TEXT,
  strategy TEXT,
  status TEXT NOT NULL CHECK (
    status IN ('started','completed','failed')
  ),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  error TEXT,
  tags TEXT[] DEFAULT '{}',
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trace_id)
);

CREATE INDEX IF NOT EXISTS idx_request_traces_trace_id ON request_traces(trace_id);
CREATE INDEX IF NOT EXISTS idx_request_traces_tenant ON request_traces(tenant);
CREATE INDEX IF NOT EXISTS idx_request_traces_provider ON request_traces(provider);
CREATE INDEX IF NOT EXISTS idx_request_traces_model ON request_traces(model);
CREATE INDEX IF NOT EXISTS idx_request_traces_created_at ON request_traces(created_at DESC);

COMMENT ON TABLE request_traces IS 'Full request traces with OpenTelemetry-compatible span data.';

-- Trace spans
CREATE TABLE IF NOT EXISTS trace_spans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL REFERENCES request_traces(trace_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  parent_span_id TEXT,
  name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('ok','error')),
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_trace_spans_trace_id ON trace_spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_trace_spans_name ON trace_spans(name);

COMMENT ON TABLE trace_spans IS 'Individual spans within a request trace.';

-- Optimizer scores
CREATE TABLE IF NOT EXISTS optimizer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL REFERENCES request_traces(trace_id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  overall DOUBLE PRECISION NOT NULL,
  components JSONB NOT NULL DEFAULT '[]'::jsonb,
  weights JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimizer_scores_trace_id ON optimizer_scores(trace_id);
CREATE INDEX IF NOT EXISTS idx_optimizer_scores_created_at ON optimizer_scores(created_at DESC);

COMMENT ON TABLE optimizer_scores IS 'Per-request optimizer score breakdown.';

-- Shadow routing results
CREATE TABLE IF NOT EXISTS shadow_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  production_provider TEXT NOT NULL,
  production_model TEXT NOT NULL,
  production_latency_ms INTEGER NOT NULL,
  production_cost DOUBLE PRECISION NOT NULL,
  production_success BOOLEAN NOT NULL,
  shadow_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  comparison JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shadow_results_trace_id ON shadow_results(trace_id);
CREATE INDEX IF NOT EXISTS idx_shadow_results_provider ON shadow_results(production_provider);
CREATE INDEX IF NOT EXISTS idx_shadow_results_created_at ON shadow_results(created_at DESC);

COMMENT ON TABLE shadow_results IS 'Shadow routing comparison results.';

-- Benchmark datasets
CREATE TABLE IF NOT EXISTS benchmark_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  request_count INTEGER NOT NULL DEFAULT 0,
  privacy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_benchmark_datasets_created_at ON benchmark_datasets(created_at DESC);

COMMENT ON TABLE benchmark_datasets IS 'Anonymized historical request datasets for benchmarking.';

-- Benchmark results
CREATE TABLE IF NOT EXISTS benchmark_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id UUID NOT NULL REFERENCES benchmark_datasets(id) ON DELETE CASCADE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_requests INTEGER NOT NULL DEFAULT 0,
  successful_requests INTEGER NOT NULL DEFAULT 0,
  failed_requests INTEGER NOT NULL DEFAULT 0,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  comparison JSONB
);

CREATE INDEX IF NOT EXISTS idx_benchmark_results_dataset_id ON benchmark_results(dataset_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_started_at ON benchmark_results(started_at DESC);

COMMENT ON TABLE benchmark_results IS 'Benchmark execution results.';

-- What-if simulations
CREATE TABLE IF NOT EXISTS what_if_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  dataset_id TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_what_if_simulations_dataset_id ON what_if_simulations(dataset_id);
CREATE INDEX IF NOT EXISTS idx_what_if_simulations_created_at ON what_if_simulations(created_at DESC);

COMMENT ON TABLE what_if_simulations IS 'What-if simulation results.';
