import { calculateScore, DEFAULT_SCORE_WEIGHTS } from '../src/optimizer-score';
import { createTrace, finalizeTrace, startSpan, endSpan, addSpanEvent, exportTrace } from '../src/tracing';
import { shouldShadow, executeShadow, computeComparison, resetShadowBudget } from '../src/shadow';
import { createDataset, runBenchmark, compareBenchmarks } from '../src/benchmarks';
import { simulate, compareWithBaseline } from '../src/what-if';
import type { NormalizedRequest, NormalizedResponse, RoutingCandidate, ProviderHealth } from '@bifrost/shared';

describe('OptimizerScore', () => {
  const baseTrace = () => ({
    traceId: 'trace-1',
    requestId: 'req-1',
    startTime: 1000,
    request: {
      model: 'test-model',
      messages: [{ role: 'user' as const, content: 'Hello world, this is a test message for token counting' }],
    },
    spans: [],
    attributes: {},
    tags: [],
    status: 'completed' as const,
  });

  test('returns overall score between 0 and 1', () => {
    const trace = baseTrace();
    const score = calculateScore(trace);
    expect(score.overall).toBeGreaterThanOrEqual(0);
    expect(score.overall).toBeLessThanOrEqual(1);
  });

  test('includes six components', () => {
    const trace = baseTrace();
    const score = calculateScore(trace);
    expect(score.components).toHaveLength(6);
    expect(score.components.map(c => c.name)).toEqual([
      'compression',
      'cache',
      'routeEfficiency',
      'providerHealth',
      'costEfficiency',
      'latencyEfficiency',
    ]);
  });

  test('cache hit yields 1.0 cache score', () => {
    const trace = baseTrace();
    trace.spans = [{
      spanId: 'span-1',
      traceId: 'trace-1',
      name: 'cache',
      startTime: 1000,
      endTime: 1100,
      attributes: { hit: true },
      events: [],
      status: 'ok' as const,
    }];
    const score = calculateScore(trace);
    const cache = score.components.find(c => c.name === 'cache');
    expect(cache?.score).toBe(1);
  });

  test('respects custom weights', () => {
    const trace = baseTrace();
    const weights = { ...DEFAULT_SCORE_WEIGHTS, compression: 0.5, cache: 0.5 };
    const score = calculateScore(trace, weights);
    expect(score.weights.compression).toBe(0.5);
    expect(score.weights.cache).toBe(0.5);
  });

  test('cost efficiency penalizes high actual cost', () => {
    const trace = baseTrace();
    trace.endTime = 5000;
    const score = calculateScore(trace, DEFAULT_SCORE_WEIGHTS, {
      estimatedMinimumCost: 0.001,
    });
    const cost = score.components.find(c => c.name === 'costEfficiency');
    expect(cost?.score).toBeGreaterThanOrEqual(0);
    expect(cost?.score).toBeLessThanOrEqual(1);
  });
});

describe('Tracing', () => {
  test('createTrace initializes trace', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const trace = createTrace(req, { tags: ['t1'] });
    expect(trace.traceId).toBeDefined();
    expect(trace.status).toBe('started');
    expect(trace.spans).toHaveLength(0);
  });

  test('addSpan appends to trace', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const trace = createTrace(req);
    const span = startSpan(trace, 'auth');
    expect(trace.spans).toHaveLength(1);
    expect(trace.spans[0].name).toBe('auth');
  });

  test('finalizeTrace sets end time and status', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const trace = createTrace(req);
    const response: NormalizedResponse = { id: '1', object: 'chat.completion', created: 1, model: 'm', choices: [], provider: 'p', cost: 0.01 };
    const finalized = finalizeTrace(trace, response);
    expect(finalized.endTime).toBeDefined();
    expect(finalized.status).toBe('completed');
    expect(finalized.provider).toBe('p');
    expect(finalized.model).toBe('m');
  });

  test('exportTrace returns valid JSON', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const trace = createTrace(req);
    finalizeTrace(trace);
    const json = exportTrace(trace, 'json');
    expect(() => JSON.parse(json)).not.toThrow();
  });

  test('exportTrace returns OTLP-compatible structure', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const trace = createTrace(req);
    finalizeTrace(trace);
    const otlp = exportTrace(trace, 'otlp');
    const parsed = JSON.parse(otlp);
    expect(parsed.resourceSpans).toBeDefined();
  });
});

describe('Shadow', () => {
  beforeEach(() => resetShadowBudget());

  test('shouldShadow returns false when disabled', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    expect(shouldShadow(req, { enabled: false, percentage: 100, maxRequestsPerMinute: 100, maxCostPerMinute: 100, alternativeStrategies: [], providers: [] })).toBe(false);
  });

  test('shouldShadow respects percentage', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const config = { enabled: true, percentage: 0, maxRequestsPerMinute: 100, maxCostPerMinute: 100, alternativeStrategies: [], providers: [] };
    expect(shouldShadow(req, config)).toBe(false);
  });

  test('shouldShadow respects budget', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const config = { enabled: true, percentage: 100, maxRequestsPerMinute: 0, maxCostPerMinute: 100, alternativeStrategies: [], providers: [] };
    expect(shouldShadow(req, config)).toBe(false);
  });

  test('executeShadow returns comparison', async () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const candidates: RoutingCandidate[] = [
      { model: { id: 'm1', provider: 'p1', contextWindow: 8192, capabilities: [], enabled: true }, provider: { id: 'p1', name: 'P1', enabled: true }, capabilities: [], qualityScore: 0.9, costScore: 0.8, latencyScore: 0.7, reliabilityScore: 0.9, availabilityScore: 1, priority: 1 },
    ];
    const result = await executeShadow(req, candidates, {
      actualProvider: 'p0',
      actualModel: 'm0',
      actualLatencyMs: 1000,
      actualTokens: 1000,
      actualCost: 0.05,
      actualSuccess: true,
      actualQualityScore: 0.85,
    });
    expect(result.shadowResults).toHaveLength(1);
    expect(result.comparison).toBeDefined();
  });

  test('computeComparison calculates deltas', () => {
    const shadows = [
      { provider: 'p1', model: 'm1', strategy: 'shadow', latencyMs: 900, tokensUsed: 950, cost: 0.04, success: true, qualityScore: 0.9, toolSuccess: true },
    ];
    const comparison = computeComparison({ latencyMs: 1000, cost: 0.05, qualityScore: 0.85, tokensUsed: 1000, success: true }, shadows);
    expect(comparison.latencyDeltaMs).toBeLessThan(0);
    expect(comparison.costDelta).toBeLessThan(0);
  });
});

describe('Benchmarks', () => {
  test('createDataset redacts PII', () => {
    const req: NormalizedRequest = { model: 'm', messages: [], user: 'alice@example.com', metadata: { client_ip: '1.2.3.4', email: 'a@b.com' } };
    const ds = createDataset('test', [req], { privacy: { redactPII: true, tenantConsent: true } });
    expect(ds.requests[0].user).toBe('[REDACTED]');
    expect(ds.requests[0].metadata?.client_ip).toBe('[REDACTED]');
    expect(ds.requests[0].metadata?.email).toBe('[REDACTED]');
  });

  test('createDataset excludes fields', () => {
    const req: NormalizedRequest = { model: 'm', messages: [], user: 'alice', metadata: { secret: 'hidden' } };
    const ds = createDataset('test', [req], { privacy: { redactPII: false, excludedFields: ['user', 'metadata.secret'] } });
    expect((ds.requests[0] as any).user).toBeUndefined();
    expect(ds.requests[0].metadata?.secret).toBeUndefined();
  });

  test('runBenchmark returns metrics', async () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const ds = createDataset('test', [req]);
    const result = await runBenchmark(ds, { shuffle: false });
    expect(result.totalRequests).toBe(1);
    expect(result.metrics).toBeDefined();
  });

  test('runBenchmark with simulateRequest', async () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const ds = createDataset('test', [req]);
    const result = await runBenchmark(ds, { shuffle: false }, {
      simulateRequest: async () => ({
        id: '1', object: 'chat.completion', created: 1, model: 'm', choices: [],
        provider: 'p', cost: 0.01,
        candidate: { model: { id: 'm', provider: 'p', contextWindow: 8192, capabilities: [], enabled: true }, provider: { id: 'p', name: 'P', enabled: true }, capabilities: [], qualityScore: 0.8, costScore: 0.7, latencyScore: 0.6, reliabilityScore: 0.9, availabilityScore: 1, priority: 1 } as RoutingCandidate,
        latencyMs: 500,
        success: true,
      }),
    });
    expect(result.successfulRequests).toBe(1);
  });

  test('compareBenchmarks returns deltas', () => {
    const baseline = { datasetId: '1', config: {}, startedAt: 0, completedAt: 1, totalRequests: 10, successfulRequests: 10, failedRequests: 0, metrics: { avgLatencyMs: 1000, avgCost: 0.05, avgTokens: 500, avgQuality: 0.8, totalCost: 0.5, totalTokens: 5000, providerDistribution: {}, fallbackCount: 0, errorCount: 0 } };
    const proposed = { datasetId: '1', config: {}, startedAt: 0, completedAt: 1, totalRequests: 10, successfulRequests: 10, failedRequests: 0, metrics: { avgLatencyMs: 800, avgCost: 0.04, avgTokens: 450, avgQuality: 0.85, totalCost: 0.4, totalTokens: 4500, providerDistribution: {}, fallbackCount: 0, errorCount: 0 } };
    const comparison = compareBenchmarks(baseline as any, proposed as any);
    expect(comparison.deltas.latencyDeltaPercent).toBeLessThan(0);
    expect(comparison.deltas.costDeltaPercent).toBeLessThan(0);
  });
});

describe('WhatIf', () => {
  test('simulate returns estimates', () => {
    const req: NormalizedRequest = { model: 'm', messages: [] };
    const ds = createDataset('test', [req]);
    const result = simulate({ name: 'test', compressionLevel: 'balanced', cachePolicy: { enabled: true } }, ds);
    expect(result.requestCount).toBe(1);
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
    expect(result.qualityEstimate).toBeGreaterThanOrEqual(0);
  });

  test('compareWithBaseline returns deltas', () => {
    const baseline: WhatIfResult = {
      config: { name: 'b', compressionLevel: 'off' },
      datasetId: '1',
      estimatedCost: 1.0,
      estimatedLatencyMs: 1000,
      providerDistribution: {},
      fallbackFrequency: 0,
      failureRate: 0,
      tokenConsumption: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      compressionSavings: 0,
      qualityEstimate: 0.8,
      requestCount: 1,
      warnings: [],
    };
    const proposed: WhatIfResult = {
      ...baseline,
      config: { name: 'p', compressionLevel: 'balanced' },
      estimatedCost: 0.8,
      estimatedLatencyMs: 900,
    };
    const comparison = compareWithBaseline(proposed, baseline);
    expect(comparison.costDeltaPercent).toBeLessThan(0);
    expect(comparison.latencyDeltaPercent).toBeLessThan(0);
  });
});
