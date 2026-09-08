import { IProvider } from './registry';

const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_TIMEOUT_MS = 30000;

export type GroqProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
};

/**
 * Groq provider adapter.
 * OpenAI-compatible endpoint. Extremely fast inference.
 * Exposes rate-limit headers: x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, etc.
 */
export class GroqProvider implements IProvider {
  name = 'groq';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: GroqProviderConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || 'llama-3.3-70b-versatile';
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(_config: Record<string, unknown>): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await this.fetchJson<{ object: string }>(`${this.baseUrl}/models`);
      return res.object === 'list' || Array.isArray(res);
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    const res = await this.fetchJson<{ data: Array<{ id: string; context_window?: number; capabilities?: string[] }> }>(
      `${this.baseUrl}/models`
    );
    return (res.data || []).map(m => ({
      id: m.id,
      name: m.id,
      contextWindow: m.context_window || 128000,
      capabilities: m.capabilities || ['chat', 'completion'],
    }));
  }

  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payload = this.buildPayload(request, false);
    const res = await this.fetchJson<Record<string, unknown>>(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if ((res as any).error) throw new Error(String((res as any).error?.message || 'Groq API error'));
    return res;
  }

  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const payload = this.buildPayload(request, true);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq stream error: ${res.status} ${text}`);
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
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (choice?.delta?.content) {
            await onChunk({
              id: parsed.id || `groq-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: parsed.created || Math.floor(Date.now() / 1000),
              model: parsed.model || this.defaultModel,
              choices: [{ index: 0, delta: { content: choice.delta.content }, finish_reason: choice.finish_reason || null }],
            });
          }
        } catch { /* skip */ }
      }
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.fetchJson<unknown>(`${this.baseUrl}/models`);
      return { healthy: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async estimateCost(_inputTokens: number, _outputTokens: number): Promise<number | null> {
    return 0; // free tier
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

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`, ...((init?.headers as Record<string, string>) || {}) },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}

export function createGroqProvider(config?: GroqProviderConfig): GroqProvider {
  return new GroqProvider(config);
}
