export type {
  RequestTrace,
  Span,
  SpanEvent,
  SpanAttributes,
  ScoreComponent,
  OptimizerScore,
  OptimizerScoreWeights,
  ShadowConfig,
  ShadowResult,
  ShadowCandidateResult,
  ShadowBudget,
  BenchmarkDataset,
  BenchmarkConfig,
  BenchmarkResult,
  WhatIfConfig,
  WhatIfResult,
  DashboardFilters,
  TraceExport,
  PIIField,
  DbRequestTrace,
  DbTraceSpan,
  DbOptimizerScore,
  DbShadowResult,
  DbBenchmarkDataset,
  DbBenchmarkResult,
  DbWhatIfSimulation,
} from './types';

export {
  DEFAULT_SCORE_WEIGHTS,
  calculateScore,
} from './optimizer-score';

export {
  generateTraceId,
  generateSpanId,
  createTrace,
  addSpan,
  startSpan,
  endSpan,
  addSpanEvent,
  finalizeTrace,
  exportTrace,
  exportTraces,
} from './tracing';

export {
  shouldShadow,
  executeShadow,
  computeComparison,
  consumeShadowBudget,
  resetShadowBudget,
} from './shadow';

export {
  createDataset,
  runBenchmark,
  compareBenchmarks,
} from './benchmarks';

export {
  simulate,
  compareWithBaseline,
} from './what-if';

export {
  getTrace,
  listTraces,
  getAggregatedScores,
  getShadowComparisonResults,
  getBenchmarkById,
  getBenchmarkResultsByDataset,
  listBenchmarkDatasets,
  runWhatIfSimulation,
} from './dashboard-api';

export {
  insertRequestTrace,
  insertTraceSpan,
  insertOptimizerScore,
  insertShadowResult,
  insertBenchmarkDataset,
  insertBenchmarkResult,
  insertWhatIfSimulation,
  getRequestTraces,
  getTraceSpans,
  getOptimizerScores,
  getShadowResults,
  getBenchmarkDataset,
  getBenchmarkResults,
  getWhatIfSimulations,
} from './db';
