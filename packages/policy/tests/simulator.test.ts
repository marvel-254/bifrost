import { PolicySimulator } from '../src/simulator';
import type { Policy, NormalizedRequest } from '../src/types';
import { PolicyRegistry } from '../src/policy-registry';

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'hello world this is a test prompt' }],
    max_tokens: 1024,
    ...overrides,
  };
}

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    name: 'sim-policy',
    priority: 10,
    version: 'v1',
    enabled: true,
    match: { conditions: { AND: [], OR: [] } },
    constraints: {},
    require: { tools: false, structured_output: false, capabilities: [] },
    prefer: { quality: 'medium', cost: 'medium', latency: 'medium' },
    fallback: { strategy: 'auto' },
    optimization: { compression: 'auto', cache: true },
    ...overrides,
  };
}

describe('PolicySimulator', () => {
  const simulator = new PolicySimulator();

  test('returns basic simulation result', () => {
    const policy = makePolicy();
    const requests = [makeRequest(), makeRequest(), makeRequest()];
    const result = simulator.simulatePolicy(policy, requests);

    expect(result.policy_name).toBe('sim-policy');
    expect(result.request_count).toBe(3);
    expect(result.estimated_cost).toBeGreaterThanOrEqual(0);
    expect(result.estimated_latency_ms).toBeGreaterThanOrEqual(0);
    expect(result.token_consumption.total_tokens).toBeGreaterThan(0);
  });

  test('quality preference affects quality estimate', () => {
    const lowPolicy = makePolicy({ prefer: { quality: 'low', cost: 'low', latency: 'low' } });
    const highPolicy = makePolicy({ prefer: { quality: 'high', cost: 'high', latency: 'high' } });
    const requests = [makeRequest()];

    const lowResult = simulator.simulatePolicy(lowPolicy, requests);
    const highResult = simulator.simulatePolicy(highPolicy, requests);

    expect(highResult.quality_estimate).toBeGreaterThan(lowResult.quality_estimate);
  });

  test('high cost preference increases estimated cost', () => {
    const lowCost = makePolicy({ prefer: { quality: 'medium', cost: 'low', latency: 'medium' } });
    const highCost = makePolicy({ prefer: { quality: 'medium', cost: 'high', latency: 'medium' } });
    const requests = [makeRequest()];

    const lowResult = simulator.simulatePolicy(lowCost, requests);
    const highResult = simulator.simulatePolicy(highCost, requests);

    expect(highResult.estimated_cost).toBeGreaterThan(lowResult.estimated_cost);
  });

  test('compression reduces token estimates', () => {
    const noCompress = makePolicy({ optimization: { compression: 'off', cache: false } });
    const compress = makePolicy({ optimization: { compression: 'balanced', cache: true } });
    const requests = [makeRequest()];

    const noResult = simulator.simulatePolicy(noCompress, requests);
    const compressResult = simulator.simulatePolicy(compress, requests);

    expect(compressResult.compression_savings).toBeGreaterThan(noResult.compression_savings);
  });

  test('empty requests returns warnings', () => {
    const policy = makePolicy();
    const result = simulator.simulatePolicy(policy, []);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.request_count).toBe(0);
  });

  test('warns on high cost estimate', () => {
    const policy = makePolicy({ constraints: { max_cost: 100000 }, prefer: { quality: 'high', cost: 'high', latency: 'high' } });
    const requests = Array.from({ length: 200000 }, () => makeRequest());
    const result = simulator.simulatePolicy(policy, requests);
    expect(result.warnings.some((w: string) => w.includes('cost'))).toBe(true);
  });

  test('compareWithBaseline computes deltas', () => {
    const current = makePolicy({ prefer: { quality: 'low', cost: 'low', latency: 'low' } });
    const proposed = makePolicy({ prefer: { quality: 'high', cost: 'high', latency: 'high' } });
    const requests = [makeRequest()];

    const result = simulator.compareWithBaseline(proposed, requests, current);
    expect(result.comparison).toBeDefined();
    expect(typeof result.comparison.cost_delta_percent).toBe('number');
    expect(typeof result.comparison.latency_delta_percent).toBe('number');
  });
});
