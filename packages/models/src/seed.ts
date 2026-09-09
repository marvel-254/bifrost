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

  // ── Ollama Cloud (ollama.com, free tier) ──────────────────────────────────
  { id: 'gemma4:31b', provider: 'ollama-cloud', displayName: 'Gemma 4 31B (Cloud)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'gpt-oss:20b', provider: 'ollama-cloud', displayName: 'GPT-OSS 20B (Cloud)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'nemotron-3-nano:30b', provider: 'ollama-cloud', displayName: 'Nemotron 3 Nano 30B (Cloud)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

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

  // ── Vercel AI Gateway ($5/mo free credit, 275+ models, zero markup) ──────
  { id: 'openai/gpt-4o', provider: 'vercel-gateway', displayName: 'GPT-4o (VG)', contextWindow: 128000, capabilities: ['chat', 'completion', 'vision', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'openai/gpt-4o-mini', provider: 'vercel-gateway', displayName: 'GPT-4o Mini (VG)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'openai/gpt-5.6-sol', provider: 'vercel-gateway', displayName: 'GPT-5.6 Sol (VG)', contextWindow: 128000, capabilities: ['chat', 'completion', 'vision', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'anthropic/claude-sonnet-4', provider: 'vercel-gateway', displayName: 'Claude Sonnet 4 (VG)', contextWindow: 200000, capabilities: ['chat', 'completion', 'vision', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'anthropic/claude-opus-4', provider: 'vercel-gateway', displayName: 'Claude Opus 4 (VG)', contextWindow: 200000, capabilities: ['chat', 'completion', 'vision', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'google/gemini-2.5-pro', provider: 'vercel-gateway', displayName: 'Gemini 2.5 Pro (VG)', contextWindow: 1048576, capabilities: ['chat', 'completion', 'vision', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'google/gemini-2.5-flash', provider: 'vercel-gateway', displayName: 'Gemini 2.5 Flash (VG)', contextWindow: 1048576, capabilities: ['chat', 'completion', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'deepseek/deepseek-v4-flash', provider: 'vercel-gateway', displayName: 'DeepSeek V4 Flash (VG)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'deepseek/deepseek-v3', provider: 'vercel-gateway', displayName: 'DeepSeek V3 (VG)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'deepseek/deepseek-v4-pro', provider: 'vercel-gateway', displayName: 'DeepSeek V4 Pro (VG)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'meta-llama/llama-3.3-70b-instruct', provider: 'vercel-gateway', displayName: 'Llama 3.3 70B (VG)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'mistralai/mistral-large-latest', provider: 'vercel-gateway', displayName: 'Mistral Large (VG)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Together AI (free $1 credit, OpenAI-compatible) ────────────────────
  { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', provider: 'together', displayName: 'Llama 3.3 70B Turbo (Together)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.88, outputPrice: 0.88, enabled: true },
  { id: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', provider: 'together', displayName: 'Llama 3.1 405B (Together)', contextWindow: 131072, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 3.50, outputPrice: 3.50, enabled: true },
  { id: 'deepseek-ai/DeepSeek-V3', provider: 'together', displayName: 'DeepSeek V3 (Together)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },
  { id: 'Qwen/Qwen2.5-72B-Instruct-Turbo', provider: 'together', displayName: 'Qwen 2.5 72B (Together)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 1.20, outputPrice: 1.20, enabled: true },
  { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', provider: 'together', displayName: 'Mixtral 8x22B (Together)', contextWindow: 65536, capabilities: ['chat', 'completion'], inputPrice: 1.20, outputPrice: 1.20, enabled: true },

  // ── Fireworks AI (free $1 credit, fast inference) ──────────────────────
  { id: 'accounts/fireworks/models/llama-v3p3-70b-instruct', provider: 'fireworks', displayName: 'Llama 3.3 70B (Fireworks)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },
  { id: 'accounts/fireworks/models/deepseek-v3', provider: 'fireworks', displayName: 'DeepSeek V3 (Fireworks)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },
  { id: 'accounts/fireworks/models/qwen-qwq-32b', provider: 'fireworks', displayName: 'Qwen QwQ 32B (Fireworks)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },

  // ── DeepInfra (free trial credits, OpenAI-compatible) ──────────────────
  { id: 'meta-llama/Llama-3.3-70B-Instruct', provider: 'deepinfra', displayName: 'Llama 3.3 70B (DeepInfra)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.35, outputPrice: 0.35, enabled: true },
  { id: 'deepseek-ai/DeepSeek-V3', provider: 'deepinfra', displayName: 'DeepSeek V3 (DeepInfra)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.55, outputPrice: 0.55, enabled: true },
  { id: 'Qwen/Qwen2.5-72B-Instruct', provider: 'deepinfra', displayName: 'Qwen 2.5 72B (DeepInfra)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.55, outputPrice: 0.55, enabled: true },

  // ── Novita AI (free $10 credits, OpenAI-compatible) ────────────────────
  { id: 'meta-llama/llama-3.3-70b-instruct', provider: 'novita', displayName: 'Llama 3.3 70B (Novita)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.35, outputPrice: 0.40, enabled: true },
  { id: 'deepseek/deepseek-r1-0528', provider: 'novita', displayName: 'DeepSeek R1 (Novita)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.55, outputPrice: 0.65, enabled: true },

  // ── Lepton AI (free tier, OpenAI-compatible) ───────────────────────────
  { id: 'llama-3.3-70b-instruct', provider: 'lepton', displayName: 'Llama 3.3 70B (Lepton)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.50, outputPrice: 0.50, enabled: true },
  { id: 'qwen-72b-chat', provider: 'lepton', displayName: 'Qwen 72B (Lepton)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.50, outputPrice: 0.50, enabled: true },

  // ── Hyperbolic (free credits, OpenAI-compatible) ───────────────────────
  { id: 'meta-llama/Meta-Llama-3.3-70B-Instruct', provider: 'hyperbolic', displayName: 'Llama 3.3 70B (Hyperbolic)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.50, outputPrice: 0.50, enabled: true },
  { id: 'deepseek-ai/DeepSeek-V3', provider: 'hyperbolic', displayName: 'DeepSeek V3 (Hyperbolic)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.50, outputPrice: 0.50, enabled: true },

  // ── Cohere (free tier, 1000 API calls/month) ──────────────────────────
  { id: 'command-r-plus', provider: 'cohere', displayName: 'Command R+', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 2.50, outputPrice: 10.00, enabled: true },
  { id: 'command-r', provider: 'cohere', displayName: 'Command R', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.15, outputPrice: 0.60, enabled: true },

  // ── AI21 Labs (free $10 trial credit) ─────────────────────────────────
  { id: 'jamba-large-1', provider: 'ai21', displayName: 'Jamba Large', contextWindow: 256000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 2.00, outputPrice: 8.00, enabled: true },
  { id: 'jamba-mini-1', provider: 'ai21', displayName: 'Jamba Mini', contextWindow: 256000, capabilities: ['chat', 'completion'], inputPrice: 0.30, outputPrice: 0.60, enabled: true },

  // ── Nvidia NIM (free 40 RPM, build.nvidia.com) ────────────────────────
  { id: 'nvidia/llama-3.3-70b-instruct', provider: 'nvidia', displayName: 'Llama 3.3 70B (Nvidia)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'meta/llama-3.1-8b-instruct', provider: 'nvidia', displayName: 'Llama 3.1 8B (Nvidia)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Anyscale (free $100 trial credit) ─────────────────────────────────
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct', provider: 'anyscale', displayName: 'Llama 3.1 70B (Anyscale)', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },

  // ── Baseten (free trial credits) ──────────────────────────────────────
  { id: 'deepseek-v3', provider: 'baseten', displayName: 'DeepSeek V3 (Baseten)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.90, outputPrice: 0.90, enabled: true },

  // ── Replicate (free trial credits) ────────────────────────────────────
  { id: 'meta/meta-llama-3.3-70b-instruct', provider: 'replicate', displayName: 'Llama 3.3 70B (Replicate)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Zhipu AI / GLM (free trial, OpenAI-compatible) ────────────────────
  { id: 'glm-4-flash', provider: 'zhipu', displayName: 'GLM-4 Flash (Free)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'glm-4-plus', provider: 'zhipu', displayName: 'GLM-4 Plus', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.50, outputPrice: 1.50, enabled: true },

  // ── 01.AI / Yi (free open-source models) ──────────────────────────────
  { id: 'yi-34b-chat', provider: '01ai', displayName: 'Yi-34B Chat', contextWindow: 4096, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── MiniMax (free trial credits) ──────────────────────────────────────
  { id: 'abab6.5-chat', provider: 'minimax', displayName: 'Abab 6.5 Chat', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 1.00, outputPrice: 1.00, enabled: true },

  // ── Moonshot AI / Kimi (free trial) ───────────────────────────────────
  { id: 'moonshot-v1-128k', provider: 'moonshot', displayName: 'Moonshot V1 128K', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 1.20, outputPrice: 1.20, enabled: true },

  // ── xAI / Grok ($25 free credit) ──────────────────────────────────────
  { id: 'grok-3', provider: 'xai', displayName: 'Grok 3', contextWindow: 131072, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 3.00, outputPrice: 15.00, enabled: true },
  { id: 'grok-3-mini', provider: 'xai', displayName: 'Grok 3 Mini', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.30, outputPrice: 0.50, enabled: true },

  // ── DeepSeek (free tier, OpenAI-compatible) ────────────────────────────
  { id: 'deepseek-chat', provider: 'deepseek', displayName: 'DeepSeek Chat', contextWindow: 131072, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.14, outputPrice: 0.28, enabled: true },
  { id: 'deepseek-reasoner', provider: 'deepseek', displayName: 'DeepSeek Reasoner', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0.55, outputPrice: 2.19, enabled: true },

  // ── Alibaba / Qwen (free tier via DashScope) ──────────────────────────
  { id: 'qwen-turbo', provider: 'qwen', displayName: 'Qwen Turbo', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'qwen-plus', provider: 'qwen', displayName: 'Qwen Plus', contextWindow: 131072, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.80, outputPrice: 2.00, enabled: true },
  { id: 'qwen-max', provider: 'qwen', displayName: 'Qwen Max', contextWindow: 32768, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 2.40, outputPrice: 9.60, enabled: true },

  // ── Baidu / ERNIE (free tier) ─────────────────────────────────────────
  { id: 'ernie-speed-128k', provider: 'baidu', displayName: 'ERNIE Speed 128K', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  { id: 'ernie-4.0-8k', provider: 'baidu', displayName: 'ERNIE 4.0', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0.50, outputPrice: 2.00, enabled: true },

  // ── ByteDance / Doubao (free tier) ────────────────────────────────────
  { id: 'doubao-pro-256k', provider: 'doubao', displayName: 'Doubao Pro 256K', contextWindow: 262144, capabilities: ['chat', 'completion'], inputPrice: 0.80, outputPrice: 2.00, enabled: true },
  { id: 'doubao-lite-128k', provider: 'doubao', displayName: 'Doubao Lite 128K', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Tencent / Hunyuan (free tier) ─────────────────────────────────────
  { id: 'hunyuan-standard', provider: 'tencent', displayName: 'Hunyuan Standard', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Featherless AI (free tier, uncensored) ────────────────────────────
  { id: 'meta-llama/Meta-Llama-3.3-70B-Instruct', provider: 'featherless', displayName: 'Llama 3.3 70B (Featherless)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Mancer (free tier, uncensored) ────────────────────────────────────
  { id: 'mythomax-l2-13b', provider: 'mancer', displayName: 'MythoMax L2 13B', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Bittensor (decentralized, free inference) ─────────────────────────
  { id: 'subtitle-llama-3.3-70b', provider: 'bittensor', displayName: 'Llama 3.3 70B (Bittensor)', contextWindow: 128000, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },

  // ── Nscale (free tier) ────────────────────────────────────────────────
  { id: 'nvidia/llama-3.1-8b-instruct', provider: 'nscale', displayName: 'Llama 3.1 8B (Nscale)', contextWindow: 131072, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
];

export function createSeedRegistry(): ModelRegistry {
  const registry = new ModelRegistry({ models: SEED_MODELS });
  return registry;
}

export { SEED_MODELS };
