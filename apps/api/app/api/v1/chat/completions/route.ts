import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Model registry (inlined for Vercel serverless cold-start) ─────────────────

const MODELS = [
  { id: 'llama3', provider: 'ollama', displayName: 'Llama 3', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mistral', provider: 'ollama', displayName: 'Mistral', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'llama3.1', provider: 'ollama', displayName: 'Llama 3.1', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gemma2', provider: 'ollama', displayName: 'Gemma 2', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
];

function getModel(id: string) {
  return MODELS.find(m => m.id === id);
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

  const model = getModel(modelId);
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

  // Provider dispatch — inlined for Vercel serverless
  if (model.provider === 'ollama') {
    if (stream) {
      return handleStreamingOllama(model, messages, temperature, maxTokens);
    } else {
      return handleNonStreamingOllama(model, messages, temperature, maxTokens);
    }
  }

  return NextResponse.json(
    { error: { message: `Provider '${model.provider}' not implemented`, type: 'internal_error' } },
    { status: 501 }
  );
}

// ── Ollama provider (direct HTTP) ─────────────────────────────────────────────

async function callOllama(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  return fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
}

async function handleNonStreamingOllama(
  model: { id: string; provider: string },
  messages: unknown[],
  temperature: number,
  maxTokens: number
): Promise<NextResponse> {
  const ollamaBody: Record<string, unknown> = {
    model: model.id,
    messages,
    stream: false,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OLLAMA_TIMEOUT_MS || 30000));
  try {
    const res = await callOllama(ollamaBody, controller.signal);
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: { message: `Ollama error: ${res.status} ${text}`, type: 'provider_error', provider: 'ollama', code: 'PROVIDER_ERROR' } },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    const message = (data.message || {}) as { content?: string; tool_calls?: unknown[] };
    const usage = (data.usage || {}) as { prompt_tokens?: number; completion_tokens?: number };

    return NextResponse.json({
      id: generateId(),
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: model.id,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: message.content || '' },
        finish_reason: message.tool_calls ? 'tool_calls' : 'stop',
      }],
      usage: {
        prompt_tokens: usage.prompt_tokens || 0,
        completion_tokens: usage.completion_tokens || 0,
        total_tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    const message = err instanceof Error ? err.message : 'Ollama request failed';
    return NextResponse.json(
      { error: { message, type: 'provider_error', provider: 'ollama', code: 'PROVIDER_ERROR' } },
      { status: 502 }
    );
  }
}

async function handleStreamingOllama(
  model: { id: string; provider: string },
  messages: unknown[],
  temperature: number,
  maxTokens: number
): Promise<NextResponse> {
  const ollamaBody: Record<string, unknown> = {
    model: model.id,
    messages,
    stream: true,
    options: {
      temperature,
      num_predict: maxTokens,
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.OLLAMA_TIMEOUT_MS || 30000));
  const id = generateId();
  const created = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(rsController) {
      // Role header chunk
      rsController.enqueue(encoder.encode(
        `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model.id, choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }] })}\n\n`
      ));

      try {
        const res = await callOllama(ollamaBody, controller.signal);
        clearTimeout(timeout);

        if (!res.ok) {
          const text = await res.text();
          rsController.enqueue(encoder.encode(
            `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model.id, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message: `Ollama error: ${res.status} ${text}`, type: 'provider_error' } })}\n\n`
          ));
          rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
          rsController.close();
          return;
        }

        const reader = (res.body as ReadableStream | null)?.getReader();
        if (!reader) {
          rsController.enqueue(encoder.encode(
            `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model.id, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message: 'No response body', type: 'provider_error' } })}\n\n`
          ));
          rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
          rsController.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6).trim();
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const message = (parsed.message || {}) as { content?: string; role?: string };
              const chunk = {
                id: parsed.id || id,
                object: 'chat.completion.chunk',
                created: parsed.created_at ? Math.floor(new Date(parsed.created_at).getTime() / 1000) : created,
                model: parsed.model || model.id,
                choices: [{
                  index: 0,
                  delta: {
                    content: message.content as string || undefined,
                    role: message.role as string || undefined,
                  },
                  finish_reason: parsed.done ? 'stop' : null,
                }],
              };
              rsController.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            } catch {
              // skip malformed lines
            }
          }
        }
      } catch (err) {
        clearTimeout(timeout);
        const message = err instanceof Error ? err.message : 'Stream error';
        rsController.enqueue(encoder.encode(
          `data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model: model.id, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], error: { message, type: 'provider_error' } })}\n\n`
        ));
      }

      rsController.enqueue(encoder.encode('data: [DONE]\n\n'));
      rsController.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  }) as unknown as NextResponse;
}
