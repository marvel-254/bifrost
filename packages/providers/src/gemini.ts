import { IProvider } from './registry';

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 60000;

export type GeminiProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
};

/**
 * Google Gemini provider adapter.
 * Uses the OpenAI-compatible endpoint at generativelanguage.googleapis.com.
 */
export class GeminiProvider implements IProvider {
  name = 'gemini';
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(config: GeminiProviderConfig = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || 'gemini-2.0-flash';
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(_config: Record<string, unknown>): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    const res = await this.fetchJson<{ models: Array<{ name: string; displayName?: string; inputTokenLimit?: number; supportedGenerationMethods?: string[] }> }>(
      `/models?key=${this.apiKey}`
    );
    return (res.models || [])
      .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
      .map(m => ({
        id: m.name.replace('models/', ''),
        name: m.displayName || m.name.replace('models/', ''),
        contextWindow: m.inputTokenLimit || 128000,
        capabilities: ['chat', 'completion'],
      }));
  }

  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const model = String(request.model || this.defaultModel);
    const messages = Array.isArray(request.messages) ? request.messages : [];
    const contents = this.toGeminiMessages(messages);

    const res = await this.fetchJson<Record<string, unknown>>(
      `/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: Number(request.temperature ?? 0.7),
            maxOutputTokens: Number(request.max_tokens ?? request.maxTokens ?? 4096),
          },
        }),
      }
    );

    const candidates = (res.candidates || []) as Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    const text = candidates[0]?.content?.parts?.[0]?.text || '';
    const usageMetadata = res.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;

    return {
      id: `gemini-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [{
        index: 0,
        message: { role: 'assistant', content: text },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: usageMetadata?.promptTokenCount ?? 0,
        completion_tokens: usageMetadata?.candidatesTokenCount ?? 0,
        total_tokens: usageMetadata?.totalTokenCount ?? 0,
      },
    };
  }

  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const model = String(request.model || this.defaultModel);
    const messages = Array.isArray(request.messages) ? request.messages : [];
    const contents = this.toGeminiMessages(messages);

    const res = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: Number(request.temperature ?? 0.7),
            maxOutputTokens: Number(request.max_tokens ?? request.maxTokens ?? 4096),
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini stream error: ${res.status} ${text}`);
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
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const candidates = (parsed.candidates || []) as Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          const text = candidates[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            await onChunk({
              id: `gemini-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model,
              choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
            });
          }
        } catch {
          // skip malformed
        }
      }
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      return { healthy: res.ok, latencyMs: Date.now() - start };
    } catch (err) {
      return { healthy: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async estimateCost(inputTokens: number, outputTokens: number): Promise<number | null> {
    // Gemini 2.0 Flash free tier: $0
    const inputCost = (inputTokens / 1_000_000) * 0;
    const outputCost = (outputTokens / 1_000_000) * 0;
    return inputCost + outputCost;
  }

  private toGeminiMessages(messages: unknown[]): Array<{ role: string; parts: Array<{ text: string }> }> {
    return messages
      .filter((m): m is { role: string; content: string } => typeof m === 'object' && m !== null && 'role' in m && 'content' in m)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content) }],
      }));
  }

  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> || {}) },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Gemini error ${res.status}: ${text}`);
    }
    return res.json() as Promise<T>;
  }
}

export function createGeminiProvider(config?: GeminiProviderConfig): GeminiProvider {
  return new GeminiProvider(config);
}
