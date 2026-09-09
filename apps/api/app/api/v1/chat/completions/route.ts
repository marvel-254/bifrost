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
  type NormalizedResponse,
  type NormalizedStreamEvent,
  type RoutingCandidate,
  type ProviderAdapter,
  createTrace,
  finalizeTrace,
  startSpan,
  endSpan,
  calculateScore,
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

let _executionEngine: Promise<ExecutionEngine> | null = null;

async function getExecutionEngine(): Promise<ExecutionEngine> {
  if (!_executionEngine) {
    _executionEngine = (async () => {
      const registry = await getProviders();
      const map = new Map<string, {
        chat(request: NormalizedRequest): Promise<NormalizedResponse>;
        stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;
      }>();
      for (const name of ['ollama', 'gemini', 'groq', 'cerebras', 'sambanova', 'openrouter', 'cloudflare', 'mistral', 'huggingface', 'vercel-gateway', 'openai', 'zen', 'ollama-cloud', 'bytez']) {
        const p = registry.getProvider(name);
        if (p) {
          map.set(name, {
            chat: async (req) => p.complete(req) as Promise<NormalizedResponse>,
            stream: async function* (req) {
              const queue: NormalizedStreamEvent[] = [];
              let resolved = false;
              const streamPromise = p.stream(req, async (chunk) => {
                queue.push(chunk as NormalizedStreamEvent);
              });
              try {
                await streamPromise;
              } finally {
                resolved = true;
              }
              while (queue.length > 0) {
                yield queue.shift()!;
              }
            },
          });
        }
      }
      return new ExecutionEngine({
        circuitBreaker: getCircuitBreaker(),
        cooldown: getCooldown(),
        fallback: getFallback(),
        backpressure: getBackpressure(),
        priorityQueue: getPriorityQueue(),
        streamKeepalive: getStreamKeepalive(),
        providerRegistry: map,
        config: {},
      });
    })();
  }
  return _executionEngine;
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
      model,
      provider: { id: provider.name, name: provider.name, enabled: true },
      capabilities: model.capabilities,
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

  const trace = createTrace(requestPayload, {
    tags: (body.tags as string[]) || [],
    tenant: body.user as string | undefined,
    application: ((body.metadata as Record<string, unknown> | undefined)?.application as string) || undefined,
  });
  const authSpan = startSpan(trace, 'authentication');
  endSpan(authSpan, 'ok');

  const routingSpan = startSpan(trace, 'routing', undefined, { strategy: strategy as unknown as string, provider: providerName, model: selectedModelId });
  endSpan(routingSpan, 'ok');

  const executionEngine = await getExecutionEngine();

  // ── Non-streaming ─────────────────────────────────────────────────────
  if (!stream) {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.PROVIDER_TIMEOUT_MS || 60000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const start = Date.now();
      const providerSpan = startSpan(trace, 'provider', undefined, { provider: providerName, model: selectedModelId, stream: false });
      const result = await executionEngine.executeWithReliability({
        request: requestPayload,
        candidates,
        stream: false,
      });
      endSpan(providerSpan, 'ok');
      const latencyMs = Date.now() - start;
      clearTimeout(timeout);

      const data = result as unknown as Record<string, unknown>;
      const choices = (data.choices || []) as Array<{ index?: number; message?: { role?: string; content?: string }; finish_reason?: string | null }>;
      const usage = (data.usage || {}) as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

      const responsePayload: NormalizedResponse = {
        id: (data.id as string) || generateId(),
        object: 'chat.completion',
        created: (data.created as number) || Math.floor(Date.now() / 1000),
        model: selectedModelId,
        choices: [],
        provider: providerName,
        cost: data.cost as number | undefined,
        usage: { prompt_tokens: usage.prompt_tokens ?? 0, completion_tokens: usage.completion_tokens ?? 0, total_tokens: usage.total_tokens ?? 0 },
      };

      finalizeTrace(trace, responsePayload);
      const score = calculateScore(trace, undefined, {
        selectedCandidateScore: candidates[0]?.qualityScore || 1,
        estimatedMinimumLatencyMs: latencyMs,
        estimatedMinimumCost: data.cost as number || 0,
      });
      void persistObservability(trace, score, latencyMs);

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
      finalizeTrace(trace, undefined, message);
      void persistObservability(trace, { overall: 0, components: [], weights: {} }, 0);
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
      const providerSpan = startSpan(trace, 'provider', undefined, { provider: providerName, model: selectedModelId, stream: true });
      let streamError: string | undefined;
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
        streamError = err instanceof Error ? err.message : 'Stream error';
        endSpan(providerSpan, 'error', streamError);
        rsController.enqueue(encoder.encode(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: selectedModelId, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message: streamError, type: 'provider_error' } })}\n\n`));
      } finally {
        clearTimeout(timeout);
        if (!streamError) endSpan(providerSpan, 'ok');
        const latencyMs = Date.now() - trace.startTime;
        finalizeTrace(trace, { id, object: 'chat.completion', created, model: selectedModelId, choices: [] } as any, streamError);
        const score = calculateScore(trace, undefined, {
          selectedCandidateScore: candidates[0]?.qualityScore || 1,
          estimatedMinimumLatencyMs: latencyMs,
        });
        void persistObservability(trace, score, latencyMs);
      }
      rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
      rsController.close();
    },
  });

  return new Response(sseStream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } }) as unknown as NextResponse;
}

async function persistObservability(trace: any, score: any, latencyMs: number) {
  try {
    const { insertRequestTrace, insertTraceSpan, insertOptimizerScore } = await import('../../../../../imports');
    await insertRequestTrace({
      requestId: trace.requestId,
      traceId: trace.traceId,
      tenant: trace.tenant,
      application: trace.application,
      provider: trace.provider,
      model: trace.model,
      strategy: trace.strategy,
      status: trace.status,
      startTime: trace.startTime,
      endTime: trace.endTime,
      error: trace.error,
      tags: trace.tags,
      attributes: trace.attributes,
    });
    for (const span of trace.spans) {
      await insertTraceSpan({
        traceId: span.traceId,
        requestId: trace.requestId,
        parentSpanId: span.parentSpanId,
        name: span.name,
        startTime: span.startTime,
        endTime: span.endTime,
        attributes: span.attributes,
        events: span.events,
        status: span.status,
        errorMessage: span.errorMessage,
      });
    }
    await insertOptimizerScore({
      traceId: trace.traceId,
      requestId: trace.requestId,
      overall: score.overall,
      components: score.components,
      weights: score.weights,
    });
  } catch {
    // observability persistence is best-effort
  }
}
