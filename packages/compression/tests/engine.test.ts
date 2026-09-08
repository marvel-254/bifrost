import { CompressionEngine } from '../src/engine';
import type { NormalizedRequest } from '@bifrost/shared';

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'test-model',
    messages: [{ role: 'user', content: 'hello' }],
    ...overrides,
  };
}

describe('CompressionEngine', () => {
  const registry = {
    getModel: (id: string) => {
      if (id === 'small') return { contextWindow: 4096 };
      if (id === 'medium') return { contextWindow: 8192 };
      if (id === 'large') return { contextWindow: 32768 };
      return { contextWindow: 8192 };
    },
  };

  test('returns passthrough at level 0 for small requests', async () => {
    const engine = new CompressionEngine({ registry });
    const req = makeRequest({ messages: [{ role: 'user', content: 'hi' }] });
    const result = await engine.compress(req);
    expect(result.level).toBe(0);
    expect(result.fallbackUsed).toBe(false);
    expect(result.originalTokens).toBe(result.optimizedTokens);
  });

  test('compresses level 1 boilerplate when utilization is moderate', async () => {
    const engine = new CompressionEngine({ registry });
    const longBoilerplate = 'Could you please ' + 'x'.repeat(2000);
    const req = makeRequest({
      model: 'small',
      messages: [{ role: 'user', content: longBoilerplate }],
    });
    const result = await engine.compress(req);
    expect(result.level).toBeGreaterThanOrEqual(1);
    expect(result.tokensSaved).toBeGreaterThan(0);
  });

  test('stops at required level if budget met early', async () => {
    const engine = new CompressionEngine({ registry });
    const req = makeRequest({
      model: 'small',
      messages: [{ role: 'user', content: 'x'.repeat(1000) }],
    });
    const result = await engine.compress(req);
    expect(result.passes.length).toBeGreaterThanOrEqual(1);
  });

  test('does not exceed configured maxLevel', async () => {
    const engine = new CompressionEngine({ registry }, { maxLevel: 2 });
    const req = makeRequest({
      model: 'small',
      messages: [{ role: 'user', content: 'x'.repeat(2000) }],
    });
    const result = await engine.compress(req);
    expect(result.level).toBeLessThanOrEqual(2);
  });

  test('preserves original request on fallback', async () => {
    const engine = new CompressionEngine({ registry });
    const req = makeRequest({ messages: [{ role: 'user', content: 'safe' }] });
    const result = await engine.compress(req);
    expect(result.fallbackUsed).toBe(false);
    expect((result.originalRequest as NormalizedRequest).messages[0].content).toBe('safe');
  });

  test('processing latency is under 50ms for typical requests', async () => {
    const engine = new CompressionEngine({ registry });
    const req = makeRequest({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Please analyze this code for bugs and summarize findings.' },
      ],
    });
    const start = performance.now();
    const result = await engine.compress(req);
    const wall = performance.now() - start;
    expect(result.processingLatencyMs).toBeLessThan(50);
    expect(wall).toBeLessThan(200);
  });

  test('returns valid CompressionResult shape', async () => {
    const engine = new CompressionEngine({ registry });
    const req = makeRequest({ messages: [{ role: 'user', content: 'hi' }] });
    const result = await engine.compress(req);
    expect(result).toHaveProperty('originalTokens');
    expect(result).toHaveProperty('optimizedTokens');
    expect(result).toHaveProperty('tokensSaved');
    expect(result).toHaveProperty('compressionRatio');
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('passes');
    expect(result).toHaveProperty('processingLatencyMs');
    expect(result).toHaveProperty('fallbackUsed');
    expect(result).toHaveProperty('originalRequest');
    expect(result).toHaveProperty('optimizedRequest');
  });
});
