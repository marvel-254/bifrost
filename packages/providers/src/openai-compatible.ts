import { IProvider } from './registry';

const DEFAULT_TIMEOUT_MS = 60000;

export type OpenAiCompatibleConfig = {
  apiKey?: string;
  baseUrl: string;
  providerName: string;
  defaultModel?: string;
  timeoutMs?: number;
};

export class OpenAiCompatibleProvider implements IProvider {
  name: string;
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: OpenAiCompatibleConfig) {
    this.name = config.providerName;
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl;
    this.defaultModel = config.defaultModel || 'gpt-4o';
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(_config?: Record<string, unknown>): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await this.fetchJson<any>(`${this.baseUrl}/models`);
      return Array.isArray(res) || res?.object === 'list';
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    try {
      const res = await this.fetchJson<any>(`${this.baseUrl}/models`);
      const data = Array.isArray(res) ? res : res?.data || [];
      return data.map((m: any) => ({
        id: m.id,
        name: m.id,
        contextWindow: m.context_window || 128000,
        capabilities: m.capabilities || ['chat', 'completion'],
      }));
    } catch {
      return [{ id: this.defaultModel, name: this.defaultModel, contextWindow: 128000, capabilities: ['chat', 'completion'] }];
    }
  }

  async chat(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const model = (params.model as string) || this.defaultModel;
    const body = { ...params, model };

    const res = await this.postJson<Record<string, unknown>>(`${this.baseUrl}/chat/completions`, body);
    return {
      id: res.id || `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: res.choices || [],
      usage: res.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  async complete(request: unknown): Promise<unknown> {
    return this.chat(request as Record<string, unknown>);
  }

  async stream(request: unknown, onChunk: (chunk: unknown) => void | Promise<void>): Promise<unknown> {
    const params = request as Record<string, unknown>;
    for await (const chunk of this.chatStream(params)) {
      await onChunk(chunk);
    }
    return {};
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.authenticate();
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (e) {
      return { healthy: false, latencyMs: Date.now() - start, error: String(e) };
    }
  }

  async estimateCost(_inputTokens: number, _outputTokens: number): Promise<number | null> {
    return null;
  }

  async *chatStream(params: Record<string, unknown>): AsyncGenerator<Record<string, unknown>> {
    const model = (params.model as string) || this.defaultModel;
    const body = { ...params, model, stream: true };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`${this.name} API error ${response.status}: ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

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
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          yield parsed;
        } catch {
          // skip malformed chunks
        }
      }
    }
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...init?.headers,
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`${this.name} API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }

  private async postJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`${this.name} API error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}

// ── Factory functions for each provider ─────────────────────────────────

export function createTogetherProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.together.xyz/v1',
    providerName: 'together',
    defaultModel: config.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    timeoutMs: config.timeoutMs,
  });
}

export function createFireworksProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    providerName: 'fireworks',
    defaultModel: config.defaultModel || 'accounts/fireworks/models/llama-v3p3-70b-instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createDeepInfraProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    providerName: 'deepinfra',
    defaultModel: config.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createNovitaProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.novita.ai/v3/openai',
    providerName: 'novita',
    defaultModel: config.defaultModel || 'meta-llama/llama-3.3-70b-instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createLeptonProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.lepton.ai/api/v1',
    providerName: 'lepton',
    defaultModel: config.defaultModel || 'llama-3.3-70b-instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createHyperbolicProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.hyperbolic.xyz/v1',
    providerName: 'hyperbolic',
    defaultModel: config.defaultModel || 'meta-llama/Meta-Llama-3.3-70B-Instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createCohereProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.cohere.com/v2',
    providerName: 'cohere',
    defaultModel: config.defaultModel || 'command-r-plus',
    timeoutMs: config.timeoutMs,
  });
}

export function createAi21Provider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.ai21.com/studio/v1',
    providerName: 'ai21',
    defaultModel: config.defaultModel || 'jamba-large-1',
    timeoutMs: config.timeoutMs,
  });
}

export function createNvidiaProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    providerName: 'nvidia',
    defaultModel: config.defaultModel || 'nvidia/llama-3.3-70b-instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createAnyscaleProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.endpoints.anyscale.com/v1',
    providerName: 'anyscale',
    defaultModel: config.defaultModel || 'meta-llama/Meta-Llama-3.1-70B-Instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createDeepSeekProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.deepseek.com/v1',
    providerName: 'deepseek',
    defaultModel: config.defaultModel || 'deepseek-chat',
    timeoutMs: config.timeoutMs,
  });
}

export function createXaiProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.x.ai/v1',
    providerName: 'xai',
    defaultModel: config.defaultModel || 'grok-3',
    timeoutMs: config.timeoutMs,
  });
}

export function createZhipuProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    providerName: 'zhipu',
    defaultModel: config.defaultModel || 'glm-4-flash',
    timeoutMs: config.timeoutMs,
  });
}

export function createQwenProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    providerName: 'qwen',
    defaultModel: config.defaultModel || 'qwen-turbo',
    timeoutMs: config.timeoutMs,
  });
}

export function createMoonshotProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.moonshot.cn/v1',
    providerName: 'moonshot',
    defaultModel: config.defaultModel || 'moonshot-v1-128k',
    timeoutMs: config.timeoutMs,
  });
}

export function createFeatherlessProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.featherless.ai/v1',
    providerName: 'featherless',
    defaultModel: config.defaultModel || 'meta-llama/Meta-Llama-3.3-70B-Instruct',
    timeoutMs: config.timeoutMs,
  });
}

export function createMancerProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://neuro.mancer.tech/oai/v1',
    providerName: 'mancer',
    defaultModel: config.defaultModel || 'mythomax-l2-13b',
    timeoutMs: config.timeoutMs,
  });
}

export function createNscaleProvider(config: { apiKey?: string; defaultModel?: string; timeoutMs?: number }) {
  return new OpenAiCompatibleProvider({
    apiKey: config.apiKey,
    baseUrl: 'https://api.nscale.com/v1',
    providerName: 'nscale',
    defaultModel: config.defaultModel || 'nvidia/llama-3.1-8b-instruct',
    timeoutMs: config.timeoutMs,
  });
}
