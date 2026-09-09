import { AutoFallback } from '../src/fallback';
import type { RoutingCandidate } from '../src/types';

interface ProviderErrorLike {
  code: string;
  message: string;
  status: number;
  provider: string;
  retryable: boolean;
}

function makeCandidate(id: string, provider: string, contextWindow = 8192, capabilities: string[] = ['chat']): RoutingCandidate {
  return {
    model: { id, provider, displayName: id, contextWindow, capabilities, inputPrice: 0, outputPrice: 0, enabled: true },
    provider: { id: provider, name: provider, enabled: true },
    capabilities,
    qualityScore: 1,
    costScore: 1,
    latencyScore: 1,
    reliabilityScore: 1,
    availabilityScore: 1,
    priority: 1,
  };
}

describe('AutoFallback', () => {
  let fallback: AutoFallback;

  beforeEach(() => {
    fallback = new AutoFallback({ maxAttempts: 3 });
  });

  test('returns empty for non-transient errors', () => {
    const candidates = [makeCandidate('m1', 'p1'), makeCandidate('m2', 'p2')];
    const error = { code: 'AUTHENTICATION_ERROR', message: 'Invalid key', status: 401, provider: 'p1', retryable: false } as ProviderErrorLike;
    expect(fallback.buildFallbackChain(error, candidates)).toHaveLength(0);
  });

  test('returns candidates for transient errors', () => {
    const candidates = [makeCandidate('m1', 'p1'), makeCandidate('m2', 'p2')];
    const error = { code: 'SERVER_ERROR', message: '500', status: 500, provider: 'p1', retryable: true } as ProviderErrorLike;
    expect(fallback.buildFallbackChain(error, candidates).length).toBeGreaterThan(0);
  });

  test('429 rotates account/provider', () => {
    const candidates = [
      makeCandidate('m1', 'openai'),
      makeCandidate('m2', 'openai'),
      makeCandidate('m3', 'groq'),
    ];
    const error = { code: 'RATE_LIMIT', message: '429', status: 429, provider: 'openai', retryable: true } as ProviderErrorLike;
    const chain = fallback.buildFallbackChain(error, candidates);
    expect(chain[0].provider.id).not.toBe('openai');
  });

  test('timeout prefers alternate provider', () => {
    const candidates = [
      makeCandidate('m1', 'openai'),
      makeCandidate('m2', 'groq'),
      makeCandidate('m3', 'anthropic'),
    ];
    const error = { code: 'TIMEOUT', message: 'timeout', status: 408, provider: 'openai', retryable: true } as ProviderErrorLike;
    const chain = fallback.buildFallbackChain(error, candidates);
    expect(chain[0].provider.id).not.toBe('openai');
  });

  test('context-too-large prefers larger context', () => {
    const candidates = [
      makeCandidate('m1', 'p1', 4096),
      makeCandidate('m2', 'p2', 128000),
      makeCandidate('m3', 'p3', 32000),
    ];
    const error = { code: 'CONTEXT_TOO_LARGE', message: 'context too large', status: 400, provider: 'p1', retryable: true } as ProviderErrorLike;
    const chain = fallback.buildFallbackChain(error, candidates);
    expect(chain[0].model.id).toBe('m2');
  });

  test('unsupported-tool prefers capability-compatible model', () => {
    const candidates = [
      makeCandidate('m1', 'p1', 8192, ['chat']),
      makeCandidate('m2', 'p2', 8192, ['chat', 'tools']),
      makeCandidate('m3', 'p3', 8192, ['chat']),
    ];
    const error = { code: 'UNSUPPORTED_TOOL', message: 'tool not supported', status: 400, provider: 'p1', retryable: true } as ProviderErrorLike;
    const chain = fallback.buildFallbackChain(error, candidates);
    expect(chain[0].model.capabilities).toContain('tools');
  });

  test('limits to maxAttempts', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => makeCandidate(`m${i}`, `p${i}`));
    const error = { code: 'SERVER_ERROR', message: '500', status: 500, provider: 'p1', retryable: true } as ProviderErrorLike;
    const chain = fallback.buildFallbackChain(error, candidates);
    expect(chain.length).toBeLessThanOrEqual(3);
  });

  test('shouldRetry respects maxAttempts', () => {
    expect(fallback.shouldRetry({ code: 'SERVER_ERROR', message: '', status: 500, provider: '', retryable: true } as ProviderErrorLike, 0)).toBe(true);
    expect(fallback.shouldRetry({ code: 'SERVER_ERROR', message: '', status: 500, provider: '', retryable: true } as ProviderErrorLike, 3)).toBe(false);
  });
});
