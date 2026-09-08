import { IProvider } from '../registry';

const DEFAULT_BASE_URL = 'https://api.zenlora.com/v1';
const DEFAULT_TIMEOUT_MS = 60000;

export type ZenProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
};

export class ZenProvider implements IProvider {
  name = 'zen';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: ZenProviderConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || 'zen-lite';
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(_config: Record<string, unknown>): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await this.fetchJson<{ models?: Array<{ id: string }>; error?: string }>(
        `${this.baseUrl}/models`,
        { method: 'GET' }
      );
      return !res.error && Array.isArray(res.models);
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    const res = await this.fetchJson<Array<{ id: string; context_window?: number; capabilities?: string[] }>>(
      `${this.baseUrl}/models`,
      { method: 'GET' }
    );
    const list = Array.isArray(res) ? res : [];
    return list.map((m: any) => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context_window || 8192,
      capabilities: m.capabilities || ['chat', 'completion'],
    }));
  }

  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payload = this.buildPayload(request, false);
    const res = await this.fetchJson<Record<string, unknown>>(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.error) {
      throw new Error(String((res as any).error?.message || 'Zen API error'));
    }

    const choice = (res as any).choices?.[0];
    const usage = (res as any).usage || {};

    return {
      id: (res as any).id || `zen-${Date.now()}`,
      object: 'chat.completion',
      created: (res as any).created || Math.floor(Date.now() / 1000),
      model: payload.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: (choice?.message?.content || '') as string,
        },
        finish_reason: choice?.finish_reason || 'stop',
      }],
      usage: {
        prompt_tokens: (usage.prompt_tokens || 0) as number,
        completion_tokens: (usage.completion_tokens || 0) as number,
        total_tokens: ((usage.prompt_tokens || 0) as number) + ((usage.completion_tokens || 0) as number),
      },
    };
  }

  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const payload = this.buildPayload(request, true);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zen stream error: ${res.status} ${text}`);
    }

    const reader = res.body?.getReader();
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
          const parsed = JSON.parse(data) as { id?: string; object?: string; created?: number; model?: string; choices?: Array<{ index?: number; delta?: { content?: string; role?: string }; finish_reason?: string | null }> };
          const chunk = this.normalizeChunk(parsed);
          await onChunk(chunk);
        } catch {
          // skip malformed lines
        }
      }
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.fetchJson<{ object: string }>(`${this.baseUrl}/models`, { method: 'GET' });
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async estimateCost(inputTokens: number, outputTokens: number): Promise<number | null> {
    // Zen pricing (approximate): $0.10/1M input, $0.30/1M output
    const inputCost = (inputTokens / 1_000_000) * 0.10;
    const outputCost = (outputTokens / 1_000_000) * 0.30;
    return inputCost + outputCost;
  }

  private buildPayload(request: Record<string, unknown>, stream: boolean): Record<string, unknown> {
    return {
      model: String(request.model || this.defaultModel),
      messages: Array.isArray(request.messages) ? request.messages : [],
      stream,
      temperature: Number(request.temperature ?? 0.7),
      max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096),
    };
  }

  private normalizeChunk(parsed: Record<string, unknown>): Record<string, unknown> {
    const choice = (parsed.choices as any[])?.[0];
    const delta = choice?.delta || {};
    return {
      id: parsed.id || `zen-${Date.now()}`,
      object: 'chat.completion.chunk',
      created: (parsed.created as number) || Math.floor(Date.now() / 1000),
      model: parsed.model || 'zen-lite',
      choices: [{
        index: (choice?.index as number) || 0,
        delta: {
          content: delta.content as string || undefined,
          role: delta.role as string || undefined,
        },
        finish_reason: choice?.finish_reason || null,
      }],
    };
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...((init?.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, {
      ...init,
      headers,
      signal: init?.signal || AbortSignal.timeout(this.timeoutMs),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zen error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }
}

export function createZenProvider(config?: ZenProviderConfig): ZenProvider {
  return new ZenProvider(config);
}
