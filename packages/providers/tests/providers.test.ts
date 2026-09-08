import { OllamaProvider, type IProvider, ProviderRegistry } from '../src/index';

// ── Mock fetch for Ollama tests ───────────────────────────────────────────────

const originalFetch = globalThis.fetch;

function mockOllamaApi(tagsResponse?: Record<string, unknown>, chatResponse?: Record<string, unknown>) {
  const tags = tagsResponse || {
    models: [
      { name: 'llama3', model: { _meta: { context_window: 8192 } } },
      { name: 'mistral', model: { _meta: { context_window: 32768 } } },
    ]
  };

  globalThis.fetch = async (url: string | URL, init?: RequestInit) => {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const isChat = urlStr.includes('/api/chat');
    const body = init?.body ? JSON.parse(String(init.body)) : {};

    if (urlStr.includes('/api/tags')) {
      return new Response(JSON.stringify(tags), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (isChat) {
      const isStreaming = body.stream === true;

      if (!isStreaming) {
        return new Response(JSON.stringify(chatResponse || {
          message: { content: 'Mock Ollama response', role: 'assistant' },
          usage: { prompt_tokens: 5, completion_tokens: 10 }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Streaming response: yield mock chunks
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const modelName = body.model || 'llama3';

          // Role chunk
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              model: modelName,
              created_at: new Date().toISOString(),
              message: { role: 'assistant' },
              done: false,
            })}\n\n`
          ));

          // Content chunk
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              model: modelName,
              created_at: new Date().toISOString(),
              message: { content: 'Mock streamed response', role: 'assistant' },
              done: false,
            })}\n\n`
          ));

          // Done chunk
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({
              model: modelName,
              created_at: new Date().toISOString(),
              message: {},
              done: true,
            })}\n\n`
          ));
          controller.close();
        },
      });

      return new Response(stream, {
        status: 200,
        headers: { 'Content-Type': 'application/x-ndjson' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    provider = new OllamaProvider({ baseUrl: 'http://mock-ollama:11434' });
    mockOllamaApi();
  });

  afterEach(() => {
    restoreFetch();
  });

  describe('constructor', () => {
    test('creates with defaults', () => {
      const p = new OllamaProvider();
      expect(p).toBeInstanceOf(OllamaProvider);
    });

    test('custom baseUrl', () => {
      const p = new OllamaProvider({ baseUrl: 'http://custom:11434' });
      expect(p).toBeInstanceOf(OllamaProvider);
    });
  });

  describe('name', () => {
    test('returns ollama', () => {
      expect(provider.name).toBe('ollama');
    });
  });

  describe('authenticate', () => {
    test('returns true when health check succeeds', async () => {
      const ok = await provider.authenticate({});
      expect(ok).toBe(true);
    });

    test('returns false when health check fails', async () => {
      globalThis.fetch = async () => {
        throw new Error('Connection refused');
      };
      const ok = await provider.authenticate({});
      expect(ok).toBe(false);
      restoreFetch();
    });
  });

  describe('listModels', () => {
    test('returns models from Ollama API', async () => {
      const models = await provider.listModels();
      expect(models).toHaveLength(2);
      expect(models[0].id).toBe('llama3');
      expect(models[0].contextWindow).toBe(8192);
      expect(models[1].id).toBe('mistral');
      expect(models[1].contextWindow).toBe(32768);
    });

    test('handles empty model list', async () => {
      mockOllamaApi({ models: [] });
      const models = await provider.listModels();
      expect(models).toHaveLength(0);
    });

    test('handles missing _meta', async () => {
      mockOllamaApi({ models: [{ name: 'test-model' }] });
      const models = await provider.listModels();
      expect(models[0].contextWindow).toBe(8192);
    });

    test('infers vision capability', async () => {
      mockOllamaApi({ models: [{ name: 'llava' }] });
      const models = await provider.listModels();
      expect(models[0].capabilities).toContain('vision');
    });

    test('infers tool_use capability', async () => {
      mockOllamaApi({ models: [{ name: 'agent-model' }] });
      const models = await provider.listModels();
      expect(models[0].capabilities).toContain('tool_use');
    });
  });

  describe('complete (non-streaming)', () => {
    test('returns completion response', async () => {
      const result = await provider.complete({
        model: 'llama3',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.5,
        maxTokens: 100,
      });

      expect(result).toHaveProperty('id');
      expect(result.model).toBe('llama3');
      expect(result.choices).toHaveLength(1);
      const firstChoice = result.choices[0] as { message?: { role?: string }; role?: string };
      expect(firstChoice.message?.role || firstChoice.role).toBe('assistant');
      expect(result.usage).toBeDefined();
    });

    test('throws on API error', async () => {
      mockOllamaApi(undefined, { error: 'Model not found' });
      await expect(
        provider.complete({ model: 'bad', messages: [{ role: 'user', content: 'hi' }] })
      ).rejects.toThrow('Model not found');
    });
  });

  describe('stream', () => {
    test('yields streamed chunks', async () => {
      const chunks: unknown[] = [];
      await provider.stream(
        { model: 'llama3', messages: [{ role: 'user', content: 'Hi' }] },
        (chunk: Record<string, unknown>) => { chunks.push(chunk); }
      );

      expect(chunks.length).toBeGreaterThanOrEqual(2);
      const firstChunk = chunks[0] as Record<string, unknown>;
      expect(firstChunk).toHaveProperty('choices');
    });

    test('streaming chunks have correct structure', async () => {
      const chunks: unknown[] = [];
      await provider.stream(
        { model: 'llama3', messages: [{ role: 'user', content: 'Hi' }] },
        (chunk: Record<string, unknown>) => { chunks.push(chunk); }
      );

      const firstChunk = chunks[0] as Record<string, unknown>;
      expect(firstChunk.object).toBe('chat.completion.chunk');
      const choices = firstChunk.choices as unknown[];
      expect(choices.length).toBeGreaterThan(0);
      expect(choices[0]).toHaveProperty('delta');
      expect(choices[0]).toHaveProperty('finish_reason');
    });

    test('throws on stream error', async () => {
      globalThis.fetch = async () => {
        return new Response('Internal error', { status: 500 });
      };
      await expect(
        provider.stream(
          { model: 'llama3', messages: [{ role: 'user', content: 'Hi' }] },
          () => {}
        )
      ).rejects.toThrow('Ollama stream error');
      restoreFetch();
    });
  });

  describe('healthCheck', () => {
    test('returns healthy when Ollama responds', async () => {
      const result = await provider.healthCheck();
      expect(result.healthy).toBe(true);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('returns unhealthy on failure', async () => {
      globalThis.fetch = async () => {
        throw new Error('Timed out');
      };
      const result = await provider.healthCheck();
      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      restoreFetch();
    });
  });

  describe('estimateCost', () => {
    test('returns 0 for local Ollama', async () => {
      const cost = await provider.estimateCost(1000, 500);
      expect(cost).toBe(0);
    });

    test('handles zero tokens', async () => {
      const cost = await provider.estimateCost(0, 0);
      expect(cost).toBe(0);
    });
  });
});

describe('ProviderRegistry', () => {
  test('starts empty', () => {
    const registry = new ProviderRegistry();
    expect(registry.getProviderCount()).toBe(0);
    expect(registry.listProviders()).toEqual([]);
  });

  test('registers provider', () => {
    const registry = new ProviderRegistry();
    const mock: IProvider = { name: 'test' } as unknown as IProvider;
    registry.register(mock);
    expect(registry.getProviderCount()).toBe(1);
    expect(registry.listProviders()).toEqual(['test']);
  });

  test('getProvider returns registered provider', () => {
    const registry = new ProviderRegistry();
    const mock: IProvider = { name: 'test' } as unknown as IProvider;
    registry.register(mock);
    expect(registry.getProvider('test')).toBe(mock);
    expect(registry.getProvider('unknown')).toBeUndefined();
  });

  test('constructor with config', () => {
    const registry = new ProviderRegistry({
      defaultProvider: 'ollama',
      providers: [
        { name: 'ollama', enabled: true },
        { name: 'groq', enabled: true },
        { name: 'gemini', enabled: false },
      ],
    });
    expect(registry.getDefaultProvider()).toBe('ollama');
    expect(registry.listProviders()).toEqual(['ollama', 'groq']);
  });

  test('setDefaultProvider', () => {
    const registry = new ProviderRegistry();
    const mock: IProvider = { name: 'x' } as unknown as IProvider;
    registry.register(mock);
    registry.setDefaultProvider('x');
    expect(registry.getDefaultProvider()).toBe('x');
  });

  test('setDefaultProvider ignores unknown', () => {
    const registry = new ProviderRegistry();
    registry.setDefaultProvider('nonexistent');
    expect(registry.getDefaultProvider()).toBeUndefined();
  });

  test('clear removes all', () => {
    const registry = new ProviderRegistry();
    const mock: IProvider = { name: 'y' } as unknown as IProvider;
    registry.register(mock);
    registry.clear();
    expect(registry.getProviderCount()).toBe(0);
    expect(registry.listProviders()).toEqual([]);
    expect(registry.getDefaultProvider()).toBeUndefined();
  });
});
