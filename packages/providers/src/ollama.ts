import { IProvider } from '../src/registry.js';

const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const OLLAMA_TIMEOUT_MS = 30000;

type OllamaTagsResponse = {
  models?: Array<{
    name: string;
    model?: {
      _meta?: {
        context_window?: number;
      };
    };
  }>;
};

type OllamaChatResponse = {
  error?: string;
  message?: {
    content?: string;
    role?: string;
    tool_calls?: unknown[];
  };
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
};

type OllamaStreamChunk = {
  model?: string;
  created_at?: string | number;
  message?: {
    content?: string;
    role?: string;
    tool_calls?: unknown[];
  };
  done?: boolean;
  id?: string;
};

export class OllamaProvider implements IProvider {
  name = 'ollama';
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: { baseUrl?: string; defaultModel?: string; timeoutMs?: number } = {}) {
    this.baseUrl = config.baseUrl || OLLAMA_DEFAULT_URL.replace(/\/+$/, '');
    this.defaultModel = config.defaultModel || 'llama3';
    this.timeoutMs = config.timeoutMs || OLLAMA_TIMEOUT_MS;
  }

  async authenticate(_config: Record<string, unknown>): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.healthy;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    const response = await this.fetchJson<OllamaTagsResponse>(`${this.baseUrl}/api/tags`);
    const models: Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }> = [];
    const list = response.models || [];
    for (const model of list) {
      models.push({
        id: model.name,
        name: model.name,
        contextWindow: model.model?._meta?.context_window || 8192,
        capabilities: this.inferCapabilities(model.name),
      });
    }
    return models;
  }

  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payload = this.buildChatPayload(request, false);
    const response = await this.fetchJson<OllamaChatResponse>(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.error) {
      throw new Error(String(response.error));
    }

    const msg = response.message || {};
    const usage = response.usage || {};

    return {
      id: `ollama-${Date.now()}`,
      model: payload.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: msg.content || '',
        },
        finish_reason: msg.tool_calls ? 'tool_calls' : 'stop',
      }],
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
      },
    };
  }

  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const payload = this.buildChatPayload(request, true);
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama stream error: ${response.status} ${text}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body stream');

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
          const parsed = JSON.parse(data) as OllamaStreamChunk;
          const chunk = this.normalizeChunk(parsed);
          await onChunk(chunk);
        } catch {
          // Skip malformed lines
        }
      }
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.fetchJson<OllamaTagsResponse>(`${this.baseUrl}/api/tags`);
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return { healthy: false, error };
    }
  }

  async estimateCost(_inputTokens: number, _outputTokens: number): Promise<number | null> {
    return 0;
  }

  private buildChatPayload(request: Record<string, unknown>, stream: boolean): Record<string, unknown> {
    return {
      model: String(request.model || this.defaultModel),
      messages: Array.isArray(request.messages) ? request.messages : [],
      stream,
      options: {
        temperature: Number(request.temperature ?? 0.7),
        num_predict: Number(request.maxTokens ?? 4096),
      },
    };
  }

  private normalizeChunk(parsed: OllamaStreamChunk): Record<string, unknown> {
    const message = parsed.message;
    const delta: Record<string, unknown> = {};

    if (message?.content) {
      delta.content = String(message.content);
    }
    if (message?.role) {
      delta.role = String(message.role);
    }
    const toolCalls = message?.tool_calls;
    if (Array.isArray(toolCalls) && toolCalls.length > 0) {
      delta.tool_calls = toolCalls;
    }

    return {
      id: parsed.id || `ollama-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: parsed.created_at ? new Date(parsed.created_at as string | number).getTime() / 1000 : Math.floor(Date.now() / 1000),
      model: parsed.model || this.defaultModel,
      choices: [{
        index: 0,
        delta,
        finish_reason: parsed.done ? 'stop' : null,
      }],
    };
  }

  private inferCapabilities(modelName: string): string[] {
    const name = modelName.toLowerCase();
    const caps: string[] = ['chat', 'completion'];
    if (name.includes('vision') || name.includes('vl') || name.includes('llava') || name.includes('gemma 3')) caps.push('vision');
    if (name.includes('tool') || name.includes('function') || name.includes('agent')) caps.push('tool_use');
    return caps;
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal || AbortSignal.timeout(this.timeoutMs),
    });
    return res.json() as Promise<T>;
  }
}

export function createOllamaProvider(config?: { baseUrl?: string; defaultModel?: string; timeoutMs?: number }): OllamaProvider {
  return new OllamaProvider(config);
}
