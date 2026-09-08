import { NextRequest, NextResponse } from 'next/server';
import { ModelRegistry } from '@bifrost/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getModelRegistry(): ModelRegistry {
  // Lazy init — same registry as in chat/completions route
  if ((globalThis as any).__bifrostModels) {
    return (globalThis as any).__bifrostModels;
  }

  const registry = new ModelRegistry({
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

  (globalThis as any).__bifrostModels = registry;
  return registry;
}

// Auth check (same key as chat/completions)
function checkAuth(request: NextRequest): { ok: boolean; status?: number } {
  const auth = request.headers.get('authorization');
  const apiKey = process.env.API_KEY || 'dev-key-change-in-production';
  if (apiKey && auth !== `Bearer ${apiKey}`) {
    return { ok: false, status: 401 };
  }
  return { ok: true };
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authCheck = checkAuth(request);
  if (!authCheck.ok) {
    return NextResponse.json(
      { error: { message: 'Unauthorized', type: 'authentication_error' } },
      { status: 401 }
    );
  }

  const models = getModelRegistry();
  const allModels = models.listModels();
  const providers = models.getProviderCount();

  // OpenAI-compatible list response
  return NextResponse.json({
    object: 'list',
    data: allModels.map(m => ({
      id: m.id,
      object: 'model',
      created: 1700000000,
      owned_by: m.provider,
      provider: m.provider,
      display_name: m.displayName,
      context_window: m.contextWindow,
      capabilities: m.capabilities,
      pricing: {
        input: m.inputPrice,
        output: m.outputPrice,
      },
    })),
    total: allModels.length,
  });
}
