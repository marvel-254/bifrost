import { NextRequest, NextResponse } from 'next/server';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry, createOllamaProvider, createOpenAiProvider, createZenProvider, createOllamaCloudProvider, createBytezProvider } from '@bifrost/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Model registry (lazy init per serverless invocation) ──────────────────────

let modelRegistry: ModelRegistry | null = null;

function getModelRegistry(): ModelRegistry {
  if (!modelRegistry) {
    modelRegistry = new ModelRegistry({
      models: [
        // Ollama (self-hosted)
        { id: 'llama3', provider: 'ollama', displayName: 'Llama 3', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
        { id: 'mistral', provider: 'ollama', displayName: 'Mistral', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
        { id: 'llama3.1', provider: 'ollama', displayName: 'Llama 3.1', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
        { id: 'gemma2', provider: 'ollama', displayName: 'Gemma 2', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

        // OpenAI
        { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 2.50, outputPrice: 10.00, enabled: true },
        { id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.15, outputPrice: 0.60, enabled: true },
        { id: 'gpt-4-turbo', provider: 'openai', displayName: 'GPT-4 Turbo', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 10.00, outputPrice: 30.00, enabled: true },

        // Zen
        { id: 'zen-lite', provider: 'zen', displayName: 'Zen Lite', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0.10, outputPrice: 0.30, enabled: true },
        { id: 'zen-pro', provider: 'zen', displayName: 'Zen Pro', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.50, outputPrice: 1.50, enabled: true },

        // Ollama Cloud
        { id: 'llama3.1', provider: 'ollama-cloud', displayName: 'Llama 3.1 (Cloud)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.025, outputPrice: 0.07, enabled: true },
        { id: 'llama3', provider: 'ollama-cloud', displayName: 'Llama 3 (Cloud)', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.025, outputPrice: 0.07, enabled: true },

        // Bytez
        { id: 'bytez-pro', provider: 'bytez', displayName: 'Bytez Pro', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.50, outputPrice: 1.50, enabled: true },
        { id: 'bytez-fast', provider: 'bytez', displayName: 'Bytez Fast', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0.10, outputPrice: 0.30, enabled: true },
      ]
    });
  }
  return modelRegistry;
}

// ── Provider registry (lazy init) ─────────────────────────────────────────────

let providerRegistry: ProviderRegistry | null = null;

function getProviderRegistry(): ProviderRegistry {
  if (!providerRegistry) {
    providerRegistry = new ProviderRegistry({ defaultProvider: 'ollama' });

    // Ollama (self-hosted) — no API key needed
    providerRegistry.register(createOllamaProvider({
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      defaultModel: 'llama3',
      timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 30000),
    }));

    // OpenAI
    providerRegistry.register(createOpenAiProvider({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || undefined,
      defaultModel: 'gpt-4o',
      timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 60000),
    }));

    // Zen
    providerRegistry.register(createZenProvider({
      apiKey: process.env.ZEN_API_KEY || '',
      baseUrl: process.env.ZEN_BASE_URL || undefined,
      defaultModel: 'zen-lite',
      timeoutMs: Number(process.env.ZEN_TIMEOUT_MS || 60000),
    }));

    // Ollama Cloud
    providerRegistry.register(createOllamaCloudProvider({
      apiKey: process.env.OLLAMA_CLOUD_API_KEY || '',
      baseUrl: process.env.OLLAMA_CLOUD_BASE_URL || undefined,
      defaultModel: 'llama3.1',
      timeoutMs: Number(process.env.OLLAMA_CLOUD_TIMEOUT_MS || 60000),
    }));

    // Bytez
    providerRegistry.register(createBytezProvider({
      apiKey: process.env.BYTEZ_API_KEY || '',
      baseUrl: process.env.BYTEZ_BASE_URL || undefined,
      defaultModel: 'bytez-pro',
      timeoutMs: Number(process.env.BYTEZ_TIMEOUT_MS || 60000),
    }));
  }
  return providerRegistry;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateId(): string {
  return `bifrost_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function checkAuth(request: NextRequest): { ok: boolean; status?: number; body?: object } {
  const auth = request.headers.get('authorization');
  const apiKey = process.env.API_KEY || 'dev-key-change-in-production';
  if (apiKey && auth !== `Bearer ${apiKey}`) {
    return { ok: false, status: 401, body: { error: { message: 'Unauthorized', type: 'authentication_error' } } };
  }
  return { ok: true };
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ── Provider call helper (normalized OpenAI-compatible) ───────────────────────

async function callProvider(
  providerName: string,
  modelId: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
  extraHeaders?: Record<string, string>
): Promise<Response> {
  const registry = getProviderRegistry();
  const provider = registry.getProvider(providerName);
  if (!provider) {
    return new Response(JSON.stringify({ error: { message: `Provider '${providerName}' not registered`, type: 'internal_error' } }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Each provider adapter implements its own HTTP call via complete()/stream(),
  // but for the route handler we need raw Response objects for streaming.
  // We'll dispatch differently for streaming vs non-streaming below.
  // This helper is used only by non-streaming path for providers that don't
  // expose a raw fetch — fallback to adapter's complete().
  return new Response(JSON.stringify({ error: { message: 'Use provider-specific handler' } }), { status: 501 });
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    version: '0.1.0',
    timestamp: Date.now(),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authCheck = checkAuth(request);
  if (!authCheck.ok) {
    return NextResponse.json(authCheck.body!, { status: authCheck.status as number });
  }

  const body = await parseBody(request);
  if (!body) {
    return NextResponse.json(
      { error: { message: 'Invalid JSON in request body', type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  const modelId = String(body.model || '');
  const messages: unknown[] = Array.isArray(body.messages) ? body.messages : [];
  const stream = Boolean(body.stream);
  const temperature = Number(body.temperature ?? 0.7);
  const maxTokens = Number(body.max_tokens ?? body.maxTokens ?? 4096);

  if (!modelId) {
    return NextResponse.json(
      { error: { message: 'Missing required parameter: model', type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  if (!messages.length) {
    return NextResponse.json(
      { error: { message: 'Missing required parameter: messages', type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  const models = getModelRegistry();
  const model = models.getModel(modelId);
  if (!model) {
    return NextResponse.json(
      { error: { message: `Model '${modelId}' not found`, type: 'model_not_found' } },
      { status: 404 }
    );
  }

  if (!model.enabled) {
    return NextResponse.json(
      { error: { message: `Model '${modelId}' is disabled`, type: 'invalid_request_error' } },
      { status: 400 }
    );
  }

  const providerName = model.provider;

  // ── Dispatch to provider adapter ──────────────────────────────────────────

  // Non-streaming: use adapter's complete()
  if (!stream) {
    const registry = getProviderRegistry();
    const provider = registry.getProvider(providerName);
    if (!provider) {
      return NextResponse.json(
        { error: { message: `Provider '${providerName}' not registered`, type: 'internal_error' } },
        { status: 501 }
      );
    }

    const requestPayload: Record<string, unknown> = {
      model: modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
    };

    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const start = Date.now();
      const result = await provider.complete(requestPayload);
      const latencyMs = Date.now() - start;

      const data = result as Record<string, unknown>;
      const choices = (data.choices || []) as Array<{ index?: number; message?: { role?: string; content?: string }; finish_reason?: string | null }>;
      const usage = (data.usage || {}) as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

      return NextResponse.json({
        id: data.id || generateId(),
        object: 'chat.completion',
        created: (data.created as number) || Math.floor(Date.now() / 1000),
        model: modelId,
        choices: [{
          index: (choices[0]?.index ?? 0) as number,
          message: {
            role: (choices[0]?.message?.role ?? 'assistant') as string,
            content: (choices[0]?.message?.content ?? '') as string,
          },
          finish_reason: choices[0]?.finish_reason || 'stop',
        }],
        usage: {
          prompt_tokens: (usage.prompt_tokens ?? 0) as number,
          completion_tokens: (usage.completion_tokens ?? 0) as number,
          total_tokens: (usage.total_tokens ?? ((usage.prompt_tokens ?? 0) as number) + ((usage.completion_tokens ?? 0) as number)) as number,
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : 'Provider request failed';
      return NextResponse.json(
        { error: { message, type: 'provider_error', provider: providerName, code: 'PROVIDER_ERROR' } },
        { status: 502 }
      );
    }
  }

  // ── Streaming: use adapter's stream() ──────────────────────────────────────

  const registry = getProviderRegistry();
  const provider = registry.getProvider(providerName);
  if (!provider) {
    return NextResponse.json(
      { error: { message: `Provider '${providerName}' not registered`, type: 'internal_error' } },
      { status: 501 }
    );
  }

  const requestPayload: Record<string, unknown> = {
    model: modelId,
    messages,
    temperature,
    max_tokens: maxTokens,
  };

  const controller = new AbortController();
  const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const id = generateId();
  const created = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  const sseStream = new ReadableStream({
    async start(rsController) {
      // Role header chunk
      rsController.enqueue(encoder.encode(
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: modelId, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`
      ));

      try {
        await provider.stream(requestPayload, async (chunk) => {
          const data = chunk as Record<string, unknown>;
          rsController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        });
      } catch (err) {
        clearTimeout(timeout);
        const message = err instanceof Error ? err.message : 'Stream error';
        rsController.enqueue(encoder.encode(
          `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: modelId, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message, type: 'provider_error' } })}\n\n`
        ));
      }

      rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
      rsController.close();
    },
  });

  clearTimeout(timeout);

  return new Response(sseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  }) as unknown as NextResponse;
}
