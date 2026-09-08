import { NextRequest, NextResponse } from 'next/server';
import {
  createSeedRegistry, type ModelRegistry,
  ProviderRegistry,
  createOllamaProvider, createOpenAiProvider, createZenProvider,
  createOllamaCloudProvider, createBytezProvider, createGeminiProvider,
  createGroqProvider, createCerebrasProvider, createSambaNovaProvider,
  createOpenRouterProvider, createCloudflareProvider, createMistralProvider,
  createHuggingFaceProvider, createVercelGatewayProvider,
  PolicyEngine,
  CompressionEngine,
  CircuitBreaker,
  ProviderCooldown,
  AutoFallback,
  BackpressureEngine,
  StreamKeepalive,
  PriorityQueue,
  ExecutionEngine,
  route,
  buildCandidates,
  DEFAULT_ROUTING_STRATEGY,
  type NormalizedMessage,
  type NormalizedRequest,
  type RoutingCandidate,
} from '../../../../../imports';
import { getAllProviderKeys } from '../../../../../../../packages/shared/src/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── DB key loader ─────────────────────────────────────────────────────────

async function loadDbKeys(): Promise<Record<string, string>> {
  try {
    const keys = await getAllProviderKeys();
    const map: Record<string, string> = {};
    for (const k of keys) {
      if (k.enabled && k.api_key) map[k.provider] = k.api_key;
    }
    return map;
  } catch { return {}; }
}

function envOrDb(envVal: string | undefined, dbVal: string | undefined): string {
  return envVal || dbVal || '';
}

// ── Lazy singletons ────────────────────────────────────────────────────────

let _models: ModelRegistry | null = null;
let _providers: ProviderRegistry | null = null;
let _policy: PolicyEngine | null = null;
let _circuitBreaker: CircuitBreaker | null = null;
let _cooldown: ProviderCooldown | null = null;
let _fallback: AutoFallback | null = null;
let _backpressure: BackpressureEngine | null = null;
let _priorityQueue: PriorityQueue | null = null;
let _streamKeepalive: StreamKeepalive | null = null;
let _executionEngine: ExecutionEngine | null = null;

function getModels(): ModelRegistry {
  if (!_models) _models = createSeedRegistry();
  return _models;
}

async function getProviders(): Promise<ProviderRegistry> {
  if (!_providers) {
    _providers = new ProviderRegistry({ defaultProvider: 'gemini' });
    const db = await loadDbKeys();

    // Tier 0 — Local
    _providers.register(createOllamaProvider({
      baseUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
      defaultModel: 'llama3',
      timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 30000),
    }));

    // Tier 1 — Recurring free
    _providers.register(createGeminiProvider({
      apiKey: envOrDb(process.env.GEMINI_API_KEY, db['gemini']),
      defaultModel: 'gemini-2.0-flash',
      timeoutMs: Number(process.env.GEMINI_TIMEOUT_MS || 60000),
    }));
    _providers.register(createGroqProvider({
      apiKey: envOrDb(process.env.GROQ_API_KEY, db['groq']),
      defaultModel: 'llama-3.3-70b-versatile',
      timeoutMs: Number(process.env.GROQ_TIMEOUT_MS || 30000),
    }));
    _providers.register(createCerebrasProvider({
      apiKey: envOrDb(process.env.CEREBRAS_API_KEY, db['cerebras']),
      defaultModel: 'llama-3.3-70b',
      timeoutMs: Number(process.env.CEREBRAS_TIMEOUT_MS || 30000),
    }));
    _providers.register(createSambaNovaProvider({
      apiKey: envOrDb(process.env.SAMBANOVA_API_KEY, db['sambanova']),
      defaultModel: 'Meta-Llama-3.3-70B-Instruct',
      timeoutMs: Number(process.env.SAMBANOVA_TIMEOUT_MS || 60000),
    }));
    _providers.register(createOpenRouterProvider({
      apiKey: envOrDb(process.env.OPENROUTER_API_KEY, db['openrouter']),
      defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
      timeoutMs: Number(process.env.OPENROUTER_TIMEOUT_MS || 60000),
    }));
    _providers.register(createCloudflareProvider({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
      apiKey: envOrDb(process.env.CLOUDFLARE_API_KEY, db['cloudflare']),
      defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp16',
      timeoutMs: Number(process.env.CLOUDFLARE_TIMEOUT_MS || 30000),
    }));
    _providers.register(createMistralProvider({
      apiKey: envOrDb(process.env.MISTRAL_API_KEY, db['mistral']),
      defaultModel: 'mistral-small-latest',
      timeoutMs: Number(process.env.MISTRAL_TIMEOUT_MS || 60000),
    }));
    _providers.register(createHuggingFaceProvider({
      apiKey: envOrDb(process.env.HUGGINGFACE_API_KEY, db['huggingface']),
      defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
      timeoutMs: Number(process.env.HUGGINGFACE_TIMEOUT_MS || 60000),
    }));
    _providers.register(createVercelGatewayProvider({
      apiKey: envOrDb(process.env.VERCEL_GATEWAY_API_KEY, db['vercel-gateway']),
      defaultModel: 'openai/gpt-4o-mini',
      timeoutMs: Number(process.env.VERCEL_GATEWAY_TIMEOUT_MS || 60000),
    }));

    // Tier 3 — Paid
    _providers.register(createOpenAiProvider({
      apiKey: envOrDb(process.env.OPENAI_API_KEY, db['openai']),
      baseUrl: process.env.OPENAI_BASE_URL || undefined,
      defaultModel: 'gpt-4o',
      timeoutMs: Number(process.env.OPENAI_TIMEOUT_MS || 60000),
    }));
    _providers.register(createZenProvider({
      apiKey: envOrDb(process.env.ZEN_API_KEY, db['zen']),
      baseUrl: process.env.ZEN_BASE_URL || undefined,
      defaultModel: 'zen-lite',
      timeoutMs: Number(process.env.ZEN_TIMEOUT_MS || 60000),
    }));
    _providers.register(createOllamaCloudProvider({
      apiKey: envOrDb(process.env.OLLAMA_CLOUD_API_KEY, db['ollama-cloud']),
      baseUrl: process.env.OLLAMA_CLOUD_BASE_URL || undefined,
      defaultModel: 'llama3.1-cloud',
      timeoutMs: Number(process.env.OLLAMA_CLOUD_TIMEOUT_MS || 60000),
    }));
    _providers.register(createBytezProvider({
      apiKey: envOrDb(process.env.BYTEZ_API_KEY, db['bytez']),
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

function getCircuitBreaker(): CircuitBreaker {
  if (!_circuitBreaker) _circuitBreaker = new CircuitBreaker();
  return _circuitBreaker;
}

function getCooldown(): ProviderCooldown {
  if (!_cooldown) _cooldown = new ProviderCooldown();
  return _cooldown;
}

function getFallback(): AutoFallback {
  if (!_fallback) _fallback = new AutoFallback();
  return _fallback;
}

function getBackpressure(): BackpressureEngine {
  if (!_backpressure) _backpressure = new BackpressureEngine();
  return _backpressure;
}

function getPriorityQueue(): PriorityQueue {
  if (!_priorityQueue) _priorityQueue = new PriorityQueue();
  return _priorityQueue;
}

function getStreamKeepalive(): StreamKeepalive {
  if (!_streamKeepalive) _streamKeepalive = new StreamKeepalive();
  return _streamKeepalive;
}

function getExecutionEngine(): ExecutionEngine {
  if (!_executionEngine) {
    const providers = getProvidersSync();
    _executionEngine = new ExecutionEngine({
      circuitBreaker: getCircuitBreaker(),
      cooldown: getCooldown(),
      fallback: getFallback(),
      backpressure: getBackpressure(),
      priorityQueue: getPriorityQueue(),
      streamKeepalive: getStreamKeepalive(),
      providerRegistry: providers,
      config: {},
    });
  }
  return _executionEngine;
}

function getProvidersSync(): Map<string, ProviderAdapter> {
  const registry = getProviders();
  const map = new Map<string, ProviderAdapter>();
  for (const name of ['ollama', 'gemini', 'groq', 'cerebras', 'sambanova', 'openrouter', 'cloudflare', 'mistral', 'huggingface', 'vercel-gateway', 'openai', 'zen', 'ollama-cloud', 'bytez']) {
    const p = registry.getProvider(name);
    if (p) map.set(name, p as unknown as ProviderAdapter);
  }
  return map;
}

let _compression: CompressionEngine | null = null;

function getCompression(): CompressionEngine {
  if (!_compression) {
    const models = getModels();
    _compression = new CompressionEngine({
      registry: {
        getModel: (id: string) => models.getModel(id),
      },
    });
  }
  return _compression;
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

  // When a specific model is requested, go direct. When "auto", use router.
  let providerName = model.provider;
  let selectedModelId = modelId;
  let candidates: RoutingCandidate[] = [];

  if (modelId === 'auto') {
    const registry = await getProviders();
    const allModels = models.listModels();
    const builtCandidates = buildCandidates(models, registry, { includeDisabled: false });

    const routingMode = (body.strategy as string) || 'balanced';
    const strategy = {
      ...DEFAULT_ROUTING_STRATEGY,
      mode: routingMode as 'manual' | 'priority' | 'cheapest' | 'fastest' | 'balanced' | 'auto',
    };

    const normalizedRequest: NormalizedRequest = {
      model: modelId,
      messages: [],
      tools: body.tools as any,
      metadata: {
        inputTokens: body.context_tokens as number | undefined,
        agentMode: !!body.agent_mode,
        requiresTools: !!body.tools,
      },
    };

    const decision = route(normalizedRequest, strategy, builtCandidates);
    if (!decision.primary) {
      return NextResponse.json({ error: { message: 'No eligible model for request', type: 'routing_error' } }, { status: 404 });
    }
    providerName = decision.primary.provider.id;
    selectedModelId = decision.primary.model.id;
    candidates = [decision.primary, ...decision.fallbacks];
  } else {
    const registry = await getProviders();
    const provider = registry.getProvider(model.provider);
    if (!provider) {
      return NextResponse.json({ error: { message: `Provider '${model.provider}' not registered`, type: 'internal_error' } }, { status: 501 });
    }
    candidates = [{
      model: { id: model.id, provider: model.provider, displayName: model.displayName, contextWindow: model.contextWindow, capabilities: model.capabilities, inputPrice: model.inputPrice, outputPrice: model.outputPrice, enabled: model.enabled },
      provider: { id: provider.name, name: provider.name, enabled: true },
      qualityScore: 1,
      costScore: 1,
      latencyScore: 1,
      reliabilityScore: 1,
      availabilityScore: 1,
      priority: 1,
    }];
  }

  let optimizedMessages = messages;
  try {
    const compression = getCompression();
    const normalizedMessages: NormalizedMessage[] = (messages as Array<{ role: string; content: string }>).map(m => ({ role: m.role as NormalizedMessage['role'], content: m.content }));
    const result = await compression.compress({
      model: selectedModelId,
      messages: normalizedMessages,
      temperature,
      top_p: body.top_p as number | undefined,
      max_tokens: maxTokens,
      stream,
      stop: body.stop as string | string[] | undefined,
      tools: body.tools as any,
      tool_choice: body.tool_choice as any,
      user: body.user as string | undefined,
      metadata: body.metadata as Record<string, unknown> | undefined,
    });
    optimizedMessages = (result.optimizedRequest as { messages: NormalizedMessage[] }).messages;
  } catch {
    // Compression is best-effort; proceed with original messages on failure.
  }

  const requestPayload: NormalizedRequest = {
    model: selectedModelId,
    messages: optimizedMessages as NormalizedMessage[],
    temperature,
    top_p: body.top_p as number | undefined,
    max_tokens: maxTokens,
    stream,
    stop: body.stop as string | string[] | undefined,
    tools: body.tools as any,
    tool_choice: body.tool_choice as any,
    user: body.user as string | undefined,
    metadata: body.metadata as Record<string, unknown> | undefined,
  };

  const executionEngine = getExecutionEngine();

  // ── Non-streaming ─────────────────────────────────────────────────────
  if (!stream) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const start = Date.now();
      const result = await executionEngine.executeWithReliability({
        request: requestPayload,
        candidates,
        stream: false,
      });
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
        const streamIterator = executionEngine.executeStreamWithReliability({
          request: requestPayload,
          candidates,
          stream: true,
        });
        for await (const chunk of streamIterator) {
          rsController.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        }
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
