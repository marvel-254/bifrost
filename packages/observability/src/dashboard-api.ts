import type {
  RequestTrace,
  DashboardFilters,
  BenchmarkDataset,
  BenchmarkResult,
  WhatIfConfig,
  WhatIfResult,
  OptimizerScore,
  ShadowResult,
} from './types';
import {
  getRequestTraces,
  getTraceSpans,
  getOptimizerScores,
  getShadowResults,
  getBenchmarkDataset as getBenchmarkDatasetDb,
  getBenchmarkResults,
  insertWhatIfSimulation,
} from './db';

export async function getTrace(traceId: string, filters?: DashboardFilters): Promise<{ trace: RequestTrace | null; spans: any[] }> {
  const traces = await getRequestTraces({ traceId, ...filters, limit: 1 });
  const trace = traces[0] || null;
  const spans = trace ? await getTraceSpans(traceId) : [];
  return { trace: trace as unknown as RequestTrace | null, spans };
}

export async function listTraces(filters: DashboardFilters): Promise<RequestTrace[]> {
  const traces = await getRequestTraces(filters);
  return traces as unknown as RequestTrace[];
}

export async function getAggregatedScores(filters: DashboardFilters): Promise<OptimizerScore[]> {
  const scores = await getOptimizerScores(filters);
  return scores as unknown as OptimizerScore[];
}

export async function getShadowComparisonResults(filters: { provider?: string; limit?: number }): Promise<ShadowResult[]> {
  const results = await getShadowResults(filters);
  return results as unknown as ShadowResult[];
}

export async function getBenchmarkById(datasetId: string): Promise<BenchmarkDataset | null> {
  return (await getBenchmarkDatasetDb(datasetId)) as unknown as BenchmarkDataset | null;
}

export async function getBenchmarkResultsByDataset(datasetId: string): Promise<BenchmarkResult[]> {
  const results = await getBenchmarkResults(datasetId);
  return results as unknown as BenchmarkResult[];
}

export async function listBenchmarkDatasets(): Promise<BenchmarkDataset[]> {
  return [];
}

export async function runWhatIfSimulation(config: WhatIfConfig, datasetId: string): Promise<WhatIfResult | null> {
  const dataset = await getBenchmarkDatasetDb(datasetId);
  if (!dataset) return null;

  const { simulate } = await import('./what-if');
  const result = simulate(config, dataset as unknown as BenchmarkDataset);

  const id = `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await insertWhatIfSimulation({
    id,
    name: config.name,
    config: config as unknown as Record<string, unknown>,
    datasetId,
    result: result as unknown as Record<string, unknown>,
  });

  return result;
}
