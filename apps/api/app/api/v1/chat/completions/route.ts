import { NextRequest, NextResponse } from 'next/server';
import { createSeedRegistry } from '@bifrost/models';
import type { ModelRegistry } from '@bifrost/models';
import {
  ProviderRegistry,
  createOllamaProvider, createOpenAiProvider, createZenProvider,
  createOllamaCloudProvider, createBytezProvider, createGeminiProvider,
  createGroqProvider, createCerebrasProvider, createSambaNovaProvider,
  createOpenRouterProvider, createCloudflareProvider, createMistralProvider,
  createHuggingFaceProvider,
} from '@bifrost/providers';
import { PolicyEngine } from '@bifrost/routing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Lazy singletons ────────────────────────────────────────────────────────

let _models: ModelRegistry | null = null;
let _providers: ProviderRegistry | null = null;
let _policy: PolicyEngine | null = null;

function getModels(): ModelRegistry {
  if (!_models) _models = createSeedRegistry();
  return _models;
}

function getProviders(): ProviderRegistry {
  if (!_providers) {
    _providers = new ProviderRegistry({ defaultProvider: 'gemini' });

    // Tier 0 — Local
    _providers.register(createOllamaProvider({
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      defaultModel: 'llama3',
      timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 30000),
    }));

    // Tier 1 — Recurring free
    _providers.register(createGeminiProvider({
      apiKey: process.env.GEMINI_API_KEY || '',
      defaultModel: 'gemini-2.0-flash',
      timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 60000),
    }));
    _providers.register(createGroqProvider({
      apiKey: process.env.GROQ_API_KEY || '',
      defaultModel: 'llama-3.3-70b-versatile',
      timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 30000),
    }));
    _providers.register(createCerebrasProvider({
      apiKey: process.env.CEREBRAS_API_KEY || '',
      defaultModel: 'llama-3.3-70b',
      timeoutMs: Number(process.env.CEREBRAS_TIMEOUT_MS || 30000),
    }));
    _providers.register(createSambaNovaProvider({
      apiKey: process.env.SAMBANOVA_API_KEY || '',
      defaultModel: 'Meta-Llama-3.3-70B-Instruct',
      timeoutMs: Number(process.env.SAMBANOVA_TIMEOUT_MS || 60000),
    }));
    _providers.register(createOpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
      timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 60000),
    }));
    _providers.register(createCloudflareProvider({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      apiKey: process.env.CLOUDFLARE_API_KEY || '',
      defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp16',
      timeoutMs: Number(process.env.CLOUDFLARE_TIMEOUT_MS || 30000),
    }));
    _providers.register(createMistralProvider({
      apiKey: process.env.MISTRAL_API_KEY || '',
      defaultModel: 'mistral-small-latest',
      timeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS || 60000),
    }));
    _providers.register(createHuggingFaceProvider({
      apiKey: process.env.HUGGINGFACE_API_KEY || '',
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
      timeoutMs: Number(process.env.HUGGINGFACE_TIMEOUT_MS || 60000),
    }));

    // Tier 3 — Paid
    _providers.register(createOpenAiProvider({
      apiKey: process.env.OPENAI_API_KEY || '',
      baseUrl: process.env.OPENAI_BASE_URL || undefined,
      defaultModel: 'gpt-4o',
      timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 60000),
    }));
    _providers.register(createZenProvider({
      apiKey: process.env.ZEN_API_KEY || '',
      baseUrl: process.env.ZEN_BASE_URL || undefined,
      defaultModel: 'zen-lite',
      timeoutMs: Number(process.env.ZEN_TIMEOUT_MS || 60000),
    }));
    _providers.register(createOllamaCloudProvider({
      apiKey: process.env.OLLAMA_CLOUD_API_KEY || '',
      baseUrl: process.env.OLLAMA_CLOUD_BASE_URL || undefined,
      defaultModel: 'llama3.1-cloud',
      timeoutMs: Number(process.env.OLLAMA_CLOUD_TIMEOUT_MS || 60000),
    }));
    _providers.register(createBytezProvider({
      apiKey: process.env.BYTEZ_API_KEY || '',
      baseUrl: process.env.BYTEZ_BASE_URL || undefined,
      defaultModel: 'bytez-pro',
      timeoutMs: Number(process.env.BYTEZ_TIMEOUT_MS || 60000),
    }));
  }
  return _providers;
}

function getPolicy(): PolicyEngine {
  if (!_policy) _policy = new PolicyEngine();
  return _policy;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return `bifrost_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function checkAuth(request: NextRequest): { ok: boolean; status?: number; body?: object } {
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) return { ok: true };
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${configuredKey}`) {
    return { ok: false, status: 401, body: { error: { message: 'Unauthorized', type: 'authentication_error' } } };
  }
  return { ok: true };
}

async function parseBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try { return await request.json() as Record<string, unknown>; } catch { return null; }
}

// ── Routes ─────────────────────────────────────────────────────────────────

export async function GET(_request: NextRequest): Promise<NextResponse> {
  return NextResponse.json({ status: 'ok', version: '0.1.0', timestamp: Date.now() });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authCheck = checkAuth(request);
  if (!authCheck.ok) return NextResponse.json(authCheck.body!, { status: authCheck.status as number });

  const body = await parseBody(request);
  if (!body) return NextResponse.json({ error: { message: 'Invalid JSON', type: 'invalid_request_error' } }, { status: 400 });

  const modelId = String(body.model || '');
  const messages: unknown[] = Array.isArray(body.messages) ? body.messages : [];
  const stream = Boolean(body.stream);
  const temperature = Number(body.temperature ?? 0.7);
  const maxTokens = Number(body.max_tokens ?? body.maxTokens ?? 4096);
  const costMode = (body.cost_mode as string) || 'any';
  const strategy = (body.strategy as string) || 'balanced';

  if (!modelId) return NextResponse.json({ error: { message: 'Missing: model', type: 'invalid_request_error' } }, { status: 400 });
  if (!messages.length) return NextResponse.json({ error: { message: 'Missing: messages', type: 'invalid_request_error' } }, { status: 400 });

  const models = getModels();
  const model = models.getModel(modelId);
  if (!model) return NextResponse.json({ error: { message: `Model '${modelId}' not found`, type: 'model_not_found' } }, { status: 404 });
  if (!model.enabled) return NextResponse.json({ error: { message: `Model '${modelId}' is disabled`, type: 'invalid_request_error' } }, { status: 400 });

  // When a specific model is requested, go direct. When "auto", use policy engine.
  let providerName = model.provider;
  let selectedModelId = modelId;

  if (modelId === 'auto') {
    const registry = getProviders();
    const policy = getPolicy();
    const allModels = models.listModels();
    const candidates = allModels
      .filter(m => m.enabled)
      .map(m => ({
        provider: { id: m.provider, name: m.provider, enabled: true, billingType: 'free' as const, streaming: true },
        model: { id: m.id, provider: m.provider, contextWindow: m.contextWindow, capabilities: m.capabilities, inputPrice: m.inputPrice ?? 0, outputPrice: m.outputPrice ?? 0, enabled: true },
        request: { tools: !!body.tools, streaming: stream, costMode: costMode as any, task: body.task as any, inputTokens: body.context_tokens as number | undefined },
      }));

    const results = policy.evaluate(candidates, strategy);
    const best = results.find(r => !r.hardFiltered);
    if (!best) return NextResponse.json({ error: { message: 'No eligible model for request', type: 'routing_error' } }, { status: 404 });
    providerName = best.provider;
    selectedModelId = best.model;
  }

  const registry = getProviders();
  const provider = registry.getProvider(providerName);
  if (!provider) return NextResponse.json({ error: { message: `Provider '${providerName}' not registered`, type: 'internal_error' } }, { status: 501 });

  const requestPayload: Record<string, unknown> = { model: selectedModelId, messages, temperature, max_tokens: maxTokens };
  if (body.tools) requestPayload.tools = body.tools;
  if (body.tool_choice) requestPayload.tool_choice = body.tool_choice;

  // ── Non-streaming ─────────────────────────────────────────────────────
  if (!stream) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const start = Date.now();
      const result = await provider.complete(requestPayload);
      const latencyMs = Date.now() - start;
      clearTimeout(timeout);

      const data = result as Record<string, unknown>;
      const choices = (data.choices || []) as Array<{ index?: number; message?: { role?: string; content?: string }; finish_reason?: string | null }>;
      const usage = (data.usage || {}) as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

      return NextResponse.json({
        id: data.id || generateId(),
        object: 'chat.completion',
        created: (data.created as number) || Math.floor(Date.now() / 1000),
        model: selectedModelId,
        choices: [{ index: 0, message: { role: 'assistant', content: choices[0]?.message?.content || '' }, finish_reason: choices[0]?.finish_reason || 'stop' }],
        usage: { prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0, total_tokens: usage.total_tokens ?? 0 },
      });
    } catch (err) {
      clearTimeout(timeout);
      const message = err instanceof Error ? err.message : 'Provider request failed';
      return NextResponse.json({ error: { message, type: 'provider_error', provider: providerName, code: 'PROVIDER_ERROR' } }, { status: 502 });
    }
  }

  // ── Streaming ─────────────────────────────────────────────────────────
  const id = generateId();
  const created = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
  const timeout = setTimeout(() => {}, timeoutMs);

  const sseStream = new ReadableStream({
    async start(rsController) {
      rsController.enqueue(encoder.encode(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: selectedModelId, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`));
      try {
        await provider.stream(requestPayload, async (chunk) => {
          rsController.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Stream error';
        rsController.enqueue(encoder.encode(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: selectedModelId, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message, type: 'provider_error' } })}\n\n`));
      } finally {
        clearTimeout(timeout);
      }
      rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
      rsController.close();
    },
  });

  return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } }) as unknown as NextResponse;
}
