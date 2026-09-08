import { ExecutionEngine } from '../src/execution-engine';
import { CircuitBreaker } from '../src/circuit-breaker';
import { ProviderCooldown } from '../src/cooldown';
import { AutoFallback } from '../src/fallback';
import { BackpressureEngine } from '../src/backpressure';
import { PriorityQueue } from '../src/priority-queue';
import { StreamKeepalive } from '../src/stream-keepalive';
import type { NormalizedRequest, NormalizedResponse, NormalizedStreamEvent } from '@bifrost/shared';
import type { RoutingCandidate, ReliabilityConfig } from '../src/types';

function makeCandidate(id: string, provider: string): RoutingCandidate {
  return {
    model: { id, provider, displayName: id, contextWindow: 8192, capabilities: ['chat'], enabled: true },
    provider: { id: provider, name: provider, enabled: true },
    qualityScore: 1,
    costScore: 1,
    latencyScore: 1,
    reliabilityScore: 1,
    availabilityScore: 1,
    priority: 1,
  };
}

function makeAdapter(provider: string, responseId: string): {
  chat(request: NormalizedRequest): Promise<NormalizedResponse>;
  stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;
} {
  return {
    chat: async () => ({ id: responseId, object: 'chat.completion', created: Date.now(), model: 'm', choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }] } as NormalizedResponse),
    stream: async function* () { yield { id: responseId, object: 'chat.completion.chunk', created: Date.now(), model: 'm', choices: [{ index: 0, delta: { content: 'hi' }, finish_reason: null }] } as NormalizedStreamEvent; },
  };
}

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;
  let circuitBreaker: CircuitBreaker;
  let cooldown: ProviderCooldown;
  let fallback: AutoFallback;
  let backpressure: BackpressureEngine;
  let priorityQueue: PriorityQueue;
  let providers: Map<string, {
    chat(request: NormalizedRequest): Promise<NormalizedResponse>;
    stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;
  }>;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker();
    cooldown = new ProviderCooldown();
    fallback = new AutoFallback();
    backpressure = new BackpressureEngine();
    priorityQueue = new PriorityQueue();
    providers = new Map();

    engine = new ExecutionEngine({
      circuitBreaker,
      cooldown,
      fallback,
      backpressure,
      priorityQueue,
      streamKeepalive: new StreamKeepalive(),
      providerRegistry: providers,
      config: {} as ReliabilityConfig,
    });
  });

  afterEach(() => {
    cooldown.destroy();
  });

  test('executes with first healthy candidate', async () => {
    providers.set('openai', makeAdapter('openai', '1'));
    const result = await engine.executeWithReliability({
      request: { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      candidates: [makeCandidate('m', 'openai')],
      stream: false,
    });
    expect(result.id).toBe('1');
  });

  test('falls back when candidate in cooldown', async () => {
    cooldown.enterCooldown('provider:model:openai:m', 'rate_limit');
    providers.set('groq', makeAdapter('groq', '2'));
    const result = await engine.executeWithReliability({
      request: { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
      candidates: [makeCandidate('m', 'openai'), makeCandidate('m', 'groq')],
      stream: false,
    });
    expect(result.id).toBe('2');
  });

  test('throws when all candidates fail', async () => {
    cooldown.enterCooldown('provider:model:openai:m', 'rate_limit');
    cooldown.enterCooldown('provider:model:groq:m', 'rate_limit');

    await expect(
      engine.executeWithReliability({
        request: { model: 'm', messages: [{ role: 'user', content: 'hi' }] },
        candidates: [makeCandidate('m', 'openai'), makeCandidate('m', 'groq')],
        stream: false,
      })
    ).rejects.toThrow();
  });
});
