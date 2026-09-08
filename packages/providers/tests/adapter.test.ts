/**
 * Tests for the ProviderAdapter contract and a sample adapter implementation.
 *
 * These tests verify the normalized interface defined in `@bifrost/shared` and
 * exercise a minimal in-memory adapter so the contract is enforced.
 */

import {
  type ProviderAdapter,
  type NormalizedRequest,
  type NormalizedResponse,
  type NormalizedStreamEvent,
  type NormalizedEmbeddingRequest,
  type NormalizedEmbeddingResponse,
  type ProviderError,
} from '../src/adapter';

// ── Minimal test adapter ────────────────────────────────────────────────────

class TestAdapter implements ProviderAdapter {
  readonly name = 'test';
  readonly capabilities = {
    chat: true,
    streaming: true,
    tools: false,
    vision: false,
    embeddings: false,
    contextWindow: 8192,
  };

  private responses: NormalizedResponse[] = [];
  private streamEvents: NormalizedStreamEvent[] = [];
  private shouldThrow: { chat?: Error; stream?: Error } = {};

  setResponse(resp: NormalizedResponse): void {
    this.responses = [resp];
  }

  setStreamEvents(events: NormalizedStreamEvent[]): void {
    this.streamEvents = events;
  }

  setThrow(kind: 'chat' | 'stream', err: Error): void {
    if (kind === 'chat') this.shouldThrow.chat = err;
    else this.shouldThrow.stream = err;
  }

  async chat(request: NormalizedRequest): Promise<NormalizedResponse> {
    if (this.shouldThrow.chat) {
      throw this.shouldThrow.chat;
    }
    return this.responses[0] ?? {
      id: `test-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [{ index: 0, message: { role: 'assistant', content: 'ok' }, finish_reason: 'stop' }],
    };
  }

  async *stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent> {
    if (this.shouldThrow.stream) {
      throw this.shouldThrow.stream;
    }
    for (const ev of this.streamEvents) {
      yield ev;
    }
  }

  async embeddings(_request: NormalizedEmbeddingRequest): Promise<NormalizedEmbeddingResponse> {
    throw new Error('embeddings not supported');
  }

  async health(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    return { healthy: true, latencyMs: 1 };
  }

  async estimateCost(_inputTokens: number, _outputTokens: number): Promise<number | null> {
    return 0;
  }
}

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'test-model',
    messages: [{ role: 'user', content: 'hello' }],
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ProviderAdapter contract', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  test('adapter exposes a name', () => {
    expect(adapter.name).toBe('test');
  });

  test('adapter exposes capabilities', () => {
    expect(adapter.capabilities.chat).toBe(true);
    expect(adapter.capabilities.streaming).toBe(true);
    expect(adapter.capabilities.contextWindow).toBe(8192);
  });

  test('chat returns a normalized response', async () => {
    const response: NormalizedResponse = {
      id: 'test-1',
      object: 'chat.completion',
      created: 1700000000,
      model: 'test-model',
      choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 },
    };
    adapter.setResponse(response);

    const result = await adapter.chat(makeRequest());
    expect(result.id).toBe('test-1');
    expect(result.object).toBe('chat.completion');
    expect(result.model).toBe('test-model');
    expect(result.choices).toHaveLength(1);
    expect(result.choices[0].message.content).toBe('hi');
    expect(result.usage?.total_tokens).toBe(3);
  });

  test('chat throws a ProviderError with retryable flag', async () => {
    const err = new Error('boom') as Error & { providerError?: ProviderError };
    err.providerError = {
      code: 'PROVIDER_ERROR',
      message: 'boom',
      status: 502,
      provider: 'test',
      retryable: true,
    };
    adapter.setThrow('chat', err);

    await expect(adapter.chat(makeRequest())).rejects.toThrow('boom');
  });

  test('stream yields normalized stream events', async () => {
    const events: NormalizedStreamEvent[] = [
      {
        id: 'test-1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'test-model',
        choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
      },
      {
        id: 'test-1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'test-model',
        choices: [{ index: 0, delta: { content: 'world' }, finish_reason: null }],
      },
      {
        id: 'test-1',
        object: 'chat.completion.chunk',
        created: 1700000000,
        model: 'test-model',
        choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      },
    ];
    adapter.setStreamEvents(events);

    const collected: NormalizedStreamEvent[] = [];
    for await (const ev of adapter.stream(makeRequest())) {
      collected.push(ev);
    }

    expect(collected).toHaveLength(3);
    expect(collected[0].object).toBe('chat.completion.chunk');
    expect(collected[0].choices[0].delta.role).toBe('assistant');
    expect(collected[1].choices[0].delta.content).toBe('world');
    expect(collected[2].choices[0].finish_reason).toBe('stop');
  });

  test('stream throws on error', async () => {
    adapter.setThrow('stream', new Error('stream failed'));
    await expect((async () => {
      for await (const _ of adapter.stream(makeRequest())) { /* drain */ }
    })()).rejects.toThrow('stream failed');
  });

  test('embeddings throws when unsupported', async () => {
    await expect(
      adapter.embeddings({ model: 'test', input: 'hi' })
    ).rejects.toThrow('embeddings not supported');
  });

  test('health returns healthy', async () => {
    const result = await adapter.health();
    expect(result.healthy).toBe(true);
    expect(result.latencyMs).toBe(1);
  });

  test('estimateCost returns null when unknown', async () => {
    const cost = await adapter.estimateCost(100, 50);
    expect(cost).toBe(0);
  });
});