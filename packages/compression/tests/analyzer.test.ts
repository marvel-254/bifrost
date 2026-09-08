import { analyzeRequest } from '../src/analyzer';
import type { NormalizedRequest } from '@bifrost/shared';

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'test-model',
    messages: [{ role: 'user', content: 'hello' }],
    ...overrides,
  };
}

describe('analyzeRequest', () => {
  test('returns zero tokens for empty messages', () => {
    const req = makeRequest({ messages: [] });
    const analysis = analyzeRequest(req, 4096);
    expect(analysis.totalInputTokens).toBeGreaterThanOrEqual(0);
    expect(analysis.contextWindow).toBe(4096);
  });

  test('counts tokens per role', () => {
    const req = makeRequest({
      messages: [
        { role: 'system', content: 'system prompt' },
        { role: 'user', content: 'user question' },
        { role: 'assistant', content: 'assistant answer' },
        { role: 'tool', content: 'tool result' },
      ],
    });
    const analysis = analyzeRequest(req, 8192);
    expect(analysis.systemTokens).toBeGreaterThan(0);
    expect(analysis.userTokens).toBeGreaterThan(0);
    expect(analysis.assistantTokens).toBeGreaterThan(0);
    expect(analysis.toolTokens).toBeGreaterThan(0);
    expect(analysis.totalInputTokens).toBe(
      analysis.systemTokens + analysis.userTokens + analysis.assistantTokens + analysis.toolTokens,
    );
  });

  test('calculates utilization ratio correctly', () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'x'.repeat(1000) }] });
    const analysis = analyzeRequest(req, 4096);
    expect(analysis.utilizationRatio).toBeGreaterThan(0);
    expect(analysis.utilizationRatio).toBeLessThanOrEqual(1);
  });

  test('uses model context window from registry', () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'hello' }] });
    const analysis = analyzeRequest(req, 16384);
    expect(analysis.contextWindow).toBe(16384);
  });

  test('estimates output from max_tokens', () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'hello' }], max_tokens: 2048 });
    const analysis = analyzeRequest(req, 4096);
    expect(analysis.reservedOutput).toBeLessThanOrEqual(2048);
  });
});
