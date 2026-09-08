import { IProvider } from './registry';

const DEFAULT_BASE_URL = 'https://api.cloudflare.com/client/v4';
const DEFAULT_TIMEOUT_MS = 30000;

export type CloudflareProviderConfig = { accountId?: string; apiKey?: string; baseUrl?: string; defaultModel?: string; timeoutMs?: number };

/**
 * Cloudflare Workers AI provider adapter.
 * Uses the REST API for Workers AI inference.
 * Free tier: 10,000 neurons/day.
 */
export class CloudflareProvider implements IProvider {
  name = 'cloudflare';
  private accountId: string; private apiKey: string; private baseUrl: string; private defaultModel: string; private timeoutMs: number;

  constructor(config: CloudflareProviderConfig = {}) {
    this.accountId = config.accountId || ''; this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL; this.defaultModel = config.defaultModel || '@cf/meta/llama-3.3-70b-instruct-fp16';
    this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(): Promise<boolean> {
    if (!this.apiKey || !this.accountId) return false;
    try { const r = await fetch(`${this.baseUrl}/accounts/${this.accountId}/ai/models/search`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(this.timeoutMs) }); return r.ok; } catch { return false; }
  }
  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    try {
      const res = await this.fetchJson<{ result: Array<{ id: string; name?: string; description?: string }> }>(`/accounts/${this.accountId}/ai/models/search`);
      return (res.result || []).map(m => ({ id: m.id, name: m.name || m.id, contextWindow: 128000, capabilities: ['chat', 'completion'] }));
    } catch { return []; }
  }
  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const model = String(request.model || this.defaultModel);
    const messages = Array.isArray(request.messages) ? request.messages : [];
    const res = await this.fetchJson<Record<string, unknown>>(`/accounts/${this.accountId}/ai/run/${model}`, {
      method: 'POST', body: JSON.stringify({ messages, stream: false, max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096), temperature: Number(request.temperature ?? 0.7) }),
    });
    const result = (res.result || {}) as { response?: string };
    return {
      id: `cf-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
      choices: [{ index: 0, message: { role: 'assistant', content: result.response || '' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }
  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    const model = String(request.model || this.defaultModel);
    const messages = Array.isArray(request.messages) ? request.messages : [];
    const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/ai/run/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ messages, stream: true, max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096), temperature: Number(request.temperature ?? 0.7) }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`Cloudflare stream error: ${res.status} ${t}`); }
    const reader = res.body?.getReader(); if (!reader) throw new Error('No body');
    const dec = new TextDecoder(); let buf = '';
    while (true) { const { done, value } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const line of lines) { const t = line.trim(); if (!t.startsWith('data: ')) continue; const d = t.slice(6).trim(); if (d === '[DONE]') continue;
        try { const p = JSON.parse(d); if (p.response) await onChunk({ id: `cf-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta: { content: p.response }, finish_reason: null }] }); } catch { /* skip */ } } }
  }
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const s = Date.now(); try { await this.authenticate(); return { healthy: true, latencyMs: Date.now() - s }; } catch (e) { return { healthy: false, error: e instanceof Error ? e.message : String(e) }; }
  }
  async estimateCost(_i: number, _o: number): Promise<number | null> { return 0; }
  private async fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}`, ...((init?.headers as Record<string, string>) || {}) }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) { const t = await res.text(); throw new Error(`Cloudflare error ${res.status}: ${t}`); }
    return res.json() as Promise<T>;
  }
}

export function createCloudflareProvider(config?: CloudflareProviderConfig): CloudflareProvider { return new CloudflareProvider(config); }
