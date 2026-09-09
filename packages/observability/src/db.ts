import { neon } from '@neondatabase/serverless';

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

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

export async function insertRequestTrace(trace: {
  requestId: string;
  traceId: string;
  tenant?: string;
  application?: string;
  provider?: string;
  model?: string;
  strategy?: string;
  status: string;
  startTime: number;
  endTime?: number;
  error?: string;
  tags: string[];
  attributes: Record<string, unknown>;
}): Promise<DbRequestTrace | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO request_traces
        (request_id, trace_id, tenant, application, provider, model, strategy, status, start_time, end_time, error, tags, attributes)
      VALUES
        (${trace.requestId}, ${trace.traceId}, ${trace.tenant || null}, ${trace.application || null}, ${trace.provider || null}, ${trace.model || null}, ${trace.strategy || null}, ${trace.status}, to_timestamp(${trace.startTime / 1000}), ${trace.endTime ? `to_timestamp(${trace.endTime / 1000})` : null}, ${trace.error || null}, ${trace.tags}, ${JSON.stringify(trace.attributes)})
      RETURNING *
    `;
    return rows[0] as unknown as DbRequestTrace;
  } catch (e) {
    console.error('db.insertRequestTrace:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertTraceSpan(span: {
  traceId: string;
  requestId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime: number;
  attributes: Record<string, unknown>;
  events: Record<string, unknown>[];
  status: string;
  errorMessage?: string;
}): Promise<DbTraceSpan | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO trace_spans
        (trace_id, request_id, parent_span_id, name, start_time, end_time, attributes, events, status, error_message)
      VALUES
        (${span.traceId}, ${span.requestId}, ${span.parentSpanId || null}, ${span.name}, to_timestamp(${span.startTime / 1000}), to_timestamp(${span.endTime / 1000}), ${JSON.stringify(span.attributes)}, ${JSON.stringify(span.events)}, ${span.status}, ${span.errorMessage || null})
      RETURNING *
    `;
    return rows[0] as unknown as DbTraceSpan;
  } catch (e) {
    console.error('db.insertTraceSpan:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertOptimizerScore(score: {
  traceId: string;
  requestId: string;
  overall: number;
  components: Record<string, unknown>;
  weights: Record<string, number>;
}): Promise<DbOptimizerScore | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO optimizer_scores
        (trace_id, request_id, overall, components, weights)
      VALUES
        (${score.traceId}, ${score.requestId}, ${score.overall}, ${JSON.stringify(score.components)}, ${JSON.stringify(score.weights)})
      RETURNING *
    `;
    return rows[0] as unknown as DbOptimizerScore;
  } catch (e) {
    console.error('db.insertOptimizerScore:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertShadowResult(result: {
  requestId: string;
  traceId: string;
  productionProvider: string;
  productionModel: string;
  productionLatencyMs: number;
  productionCost: number;
  productionSuccess: boolean;
  shadowResults: Record<string, unknown>[];
  comparison: Record<string, unknown>;
}): Promise<DbShadowResult | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO shadow_results
        (request_id, trace_id, production_provider, production_model, production_latency_ms, production_cost, production_success, shadow_results, comparison)
      VALUES
        (${result.requestId}, ${result.traceId}, ${result.productionProvider}, ${result.productionModel}, ${result.productionLatencyMs}, ${result.productionCost}, ${result.productionSuccess}, ${JSON.stringify(result.shadowResults)}, ${JSON.stringify(result.comparison)})
      RETURNING *
    `;
    return rows[0] as unknown as DbShadowResult;
  } catch (e) {
    console.error('db.insertShadowResult:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertBenchmarkDataset(dataset: {
  id: string;
  name: string;
  description?: string;
  requestCount: number;
  privacy: Record<string, unknown>;
  createdBy?: string;
}): Promise<DbBenchmarkDataset | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO benchmark_datasets
        (id, name, description, request_count, privacy, created_by)
      VALUES
        (${dataset.id}, ${dataset.name}, ${dataset.description || null}, ${dataset.requestCount}, ${JSON.stringify(dataset.privacy)}, ${dataset.createdBy || null})
      RETURNING *
    `;
    return rows[0] as unknown as DbBenchmarkDataset;
  } catch (e) {
    console.error('db.insertBenchmarkDataset:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertBenchmarkResult(result: {
  id: string;
  datasetId: string;
  config: Record<string, unknown>;
  startedAt: number;
  completedAt: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  metrics: Record<string, unknown>;
  comparison?: Record<string, unknown>;
}): Promise<DbBenchmarkResult | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO benchmark_results
        (id, dataset_id, config, started_at, completed_at, total_requests, successful_requests, failed_requests, metrics, comparison)
      VALUES
        (${result.id}, ${result.datasetId}, ${JSON.stringify(result.config)}, to_timestamp(${result.startedAt / 1000}), to_timestamp(${result.completedAt / 1000}), ${result.totalRequests}, ${result.successfulRequests}, ${result.failedRequests}, ${JSON.stringify(result.metrics)}, ${result.comparison ? JSON.stringify(result.comparison) : null})
      RETURNING *
    `;
    return rows[0] as unknown as DbBenchmarkResult;
  } catch (e) {
    console.error('db.insertBenchmarkResult:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function insertWhatIfSimulation(simulation: {
  id: string;
  name: string;
  config: Record<string, unknown>;
  datasetId: string;
  result: Record<string, unknown>;
}): Promise<DbWhatIfSimulation | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO what_if_simulations
        (id, name, config, dataset_id, result)
      VALUES
        (${simulation.id}, ${simulation.name}, ${JSON.stringify(simulation.config)}, ${simulation.datasetId}, ${JSON.stringify(simulation.result)})
      RETURNING *
    `;
    return rows[0] as unknown as DbWhatIfSimulation;
  } catch (e) {
    console.error('db.insertWhatIfSimulation:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

export async function getRequestTraces(filters: {
  traceId?: string;
  tenant?: string;
  application?: string;
  provider?: string;
  model?: string;
  strategy?: string;
  startTime?: number;
  endTime?: number;
  tag?: string;
  limit?: number;
  offset?: number;
}): Promise<DbRequestTrace[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    let query = 'SELECT * FROM request_traces WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;

    if (filters.traceId) { query += ` AND trace_id = $${idx++}`; params.push(filters.traceId); }
    if (filters.tenant) { query += ` AND tenant = $${idx++}`; params.push(filters.tenant); }
    if (filters.application) { query += ` AND application = $${idx++}`; params.push(filters.application); }
    if (filters.provider) { query += ` AND provider = $${idx++}`; params.push(filters.provider); }
    if (filters.model) { query += ` AND model = $${idx++}`; params.push(filters.model); }
    if (filters.strategy) { query += ` AND strategy = $${idx++}`; params.push(filters.strategy); }
    if (filters.startTime) { query += ` AND start_time >= to_timestamp(${idx++})`; params.push(filters.startTime / 1000); }
    if (filters.endTime) { query += ` AND end_time <= to_timestamp(${idx++})`; params.push(filters.endTime / 1000); }
    if (filters.tag) { query += ` AND $${idx++} = ANY(tags)`; params.push(filters.tag); }

    query += ' ORDER BY start_time DESC';
    if (filters.limit) { query += ` LIMIT $${idx++}`; params.push(filters.limit); }
    if (filters.offset) { query += ` OFFSET $${idx++}`; params.push(filters.offset); }

    const rows = await sql(query, params, { fullResults: true });
    return (rows as unknown as { rows: DbRequestTrace[] }).rows;
  } catch (e) {
    console.error('db.getRequestTraces:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getTraceSpans(traceId: string): Promise<DbTraceSpan[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM trace_spans WHERE trace_id = ${traceId} ORDER BY start_time ASC`;
    return rows as unknown as DbTraceSpan[];
  } catch (e) {
    console.error('db.getTraceSpans:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getOptimizerScores(filters: { traceId?: string; provider?: string; model?: string; limit?: number }): Promise<DbOptimizerScore[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    let query = 'SELECT * FROM optimizer_scores WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (filters.traceId) { query += ` AND trace_id = $${idx++}`; params.push(filters.traceId); }
    if (filters.provider) { query += ` AND (components->>'provider')::text = $${idx++}`; params.push(filters.provider); }
    if (filters.model) { query += ` AND (components->>'model')::text = $${idx++}`; params.push(filters.model); }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) { query += ` LIMIT $${idx++}`; params.push(filters.limit); }

    const rows = await sql(query, params, { fullResults: true });
    return (rows as unknown as { rows: DbOptimizerScore[] }).rows;
  } catch (e) {
    console.error('db.getOptimizerScores:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getShadowResults(filters: { provider?: string; limit?: number }): Promise<DbShadowResult[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    let query = 'SELECT * FROM shadow_results WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (filters.provider) { query += ` AND production_provider = $${idx++}`; params.push(filters.provider); }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) { query += ` LIMIT $${idx++}`; params.push(filters.limit); }

    const rows = await sql(query, params, { fullResults: true });
    return (rows as unknown as { rows: DbShadowResult[] }).rows;
  } catch (e) {
    console.error('db.getShadowResults:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getBenchmarkDataset(id: string): Promise<DbBenchmarkDataset | null> {
  const sql = getSql();
  if (!sql) return null;
  try {
    const rows = await sql`SELECT * FROM benchmark_datasets WHERE id = ${id}`;
    return (rows[0] as unknown as DbBenchmarkDataset) || null;
  } catch { return null; }
}

export async function listBenchmarkDatasets(): Promise<DbBenchmarkDataset[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM benchmark_datasets ORDER BY created_at DESC`;
    return rows as unknown as DbBenchmarkDataset[];
  } catch (e) {
    console.error('db.listBenchmarkDatasets:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getBenchmarkResults(datasetId: string): Promise<DbBenchmarkResult[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM benchmark_results WHERE dataset_id = ${datasetId} ORDER BY started_at DESC`;
    return rows as unknown as DbBenchmarkResult[];
  } catch (e) {
    console.error('db.getBenchmarkResults:', e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function getWhatIfSimulations(filters: { datasetId?: string; limit?: number }): Promise<DbWhatIfSimulation[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    let query = 'SELECT * FROM what_if_simulations WHERE 1=1';
    const params: unknown[] = [];
    let idx = 1;
    if (filters.datasetId) { query += ` AND dataset_id = $${idx++}`; params.push(filters.datasetId); }
    query += ' ORDER BY created_at DESC';
    if (filters.limit) { query += ` LIMIT $${idx++}`; params.push(filters.limit); }

    const rows = await sql(query, params, { fullResults: true });
    return (rows as unknown as { rows: DbWhatIfSimulation[] }).rows;
  } catch (e) {
    console.error('db.getWhatIfSimulations:', e instanceof Error ? e.message : String(e));
    return [];
  }
}
