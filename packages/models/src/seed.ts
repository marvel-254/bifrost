import { ModelRegistry } from './registry';
import type { Model } from './types';

const SEED_MODELS: Model[] = [
  // ── Ollama (self-hosted, free) ───────────────────────────────────────────
  { id: 'llama3', provider: 'ollama', displayName: 'Llama 3', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mistral', provider: 'ollama', displayName: 'Mistral', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'llama3.1', provider: 'ollama', displayName: 'Llama 3.1', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gemma2', provider: 'ollama', displayName: 'Gemma 2', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── OpenAI (paid) ───────────────────────────────────────────────────────
  { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 2.50, outputPrice: 10.00, enabled: true },
  { id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.15, outputPrice: 0.60, enabled: true },
  { id: 'gpt-4-turbo', provider: 'openai', displayName: 'GPT-4 Turbo', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 10.00, outputPrice: 30.00, enabled: true },

  // ── Zen (cheap paid) ────────────────────────────────────────────────────
  { id: 'zen-lite', provider: 'zen', displayName: 'Zen Lite', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0.10, outputPrice: 0.30, enabled: true },
  { id: 'zen-pro', provider: 'zen', displayName: 'Zen Pro', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.50, outputPrice: 1.50, enabled: true },

  // ── Ollama Cloud (cheap paid) ───────────────────────────────────────────
  { id: 'llama3.1-cloud', provider: 'ollama-cloud', displayName: 'Llama 3.1 (Cloud)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.025, outputPrice: 0.07, enabled: true },
  { id: 'llama3-cloud', provider: 'ollama-cloud', displayName: 'Llama 3 (Cloud)', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.025, outputPrice: 0.07, enabled: true },

  // ── Bytez (paid) ────────────────────────────────────────────────────────
  { id: 'bytez-pro', provider: 'bytez', displayName: 'Bytez Pro', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0.50, outputPrice: 1.50, enabled: true },
  { id: 'bytez-fast', provider: 'bytez', displayName: 'Bytez Fast', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0.10, outputPrice: 0.30, enabled: true },

  // ── Gemini (free tier) ──────────────────────────────────────────────────
  { id: 'gemini-2.0-flash', provider: 'gemini', displayName: 'Gemini 2.0 Flash', contextWindow: 1048576, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gemini-2.5-flash', provider: 'gemini', displayName: 'Gemini 2.5 Flash', contextWindow: 1048576, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gemini-2.5-pro', provider: 'gemini', displayName: 'Gemini 2.5 Pro', contextWindow: 1048576, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 1.25, outputPrice: 10.00, enabled: true },

  // ── Groq (free tier, ultra-fast) ────────────────────────────────────────
  { id: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'Llama 3.3 70B Versatile', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'llama-3.1-8b-instant', provider: 'groq', displayName: 'Llama 3.1 8B Instant', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gemma2-9b-it', provider: 'groq', displayName: 'Gemma 2 9B', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mixtral-8x7b-32768', provider: 'groq', displayName: 'Mixtral 8x7B', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Cerebras (free tier, ultra-fast) ────────────────────────────────────
  { id: 'llama-3.3-70b', provider: 'cerebras', displayName: 'Llama 3.3 70B', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'llama-3.1-8b', provider: 'cerebras', displayName: 'Llama 3.1 8B', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── SambaNova (free tier) ───────────────────────────────────────────────
  { id: 'Meta-Llama-3.3-70B-Instruct', provider: 'sambanova', displayName: 'Llama 3.3 70B (SambaNova)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'DeepSeek-R1', provider: 'sambanova', displayName: 'DeepSeek R1', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── OpenRouter (free models via :free suffix) ───────────────────────────
  { id: 'meta-llama/llama-3.3-70b-instruct:free', provider: 'openrouter', displayName: 'Llama 3.3 70B (OpenRouter Free)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'qwen/qwen-2.5-72b-instruct:free', provider: 'openrouter', displayName: 'Qwen 2.5 72B (Free)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'google/gemma-2-9b-it:free', provider: 'openrouter', displayName: 'Gemma 2 9B (Free)', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Cloudflare Workers AI (free tier, 10K neurons/day) ──────────────────
  { id: '@cf/meta/llama-3.3-70b-instruct-fp16', provider: 'cloudflare', displayName: 'Llama 3.3 70B (Cloudflare)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: '@cf/meta/llama-3.1-8b-instruct-fp16', provider: 'cloudflare', displayName: 'Llama 3.1 8B (Cloudflare)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Mistral (free tier) ────────────────────────────────────────────────
  { id: 'mistral-small-latest', provider: 'mistral', displayName: 'Mistral Small', contextWindow: 32768, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mistral-medium-latest', provider: 'mistral', displayName: 'Mistral Medium', contextWindow: 32768, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.27, outputPrice: 0.81, enabled: true },
  { id: 'open-mistral-nemo', provider: 'mistral', displayName: 'Mistral Nemo', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Hugging Face Inference (overflow, $0.10/month free credit) ──────────
  { id: 'meta-llama/Llama-3.3-70B-Instruct', provider: 'huggingface', displayName: 'Llama 3.3 70B (HF)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'Qwen/Qwen2.5-72B-Instruct', provider: 'huggingface', displayName: 'Qwen 2.5 72B (HF)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mistralai/Mistral-7B-Instruct-v0.3', provider: 'huggingface', displayName: 'Mistral 7B (HF)', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
];

export function createSeedRegistry(): ModelRegistry {
  const registry = new ModelRegistry({ models: SEED_MODELS });
  return registry;
}

export { SEED_MODELS };
