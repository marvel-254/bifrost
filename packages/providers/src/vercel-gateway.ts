import { IProvider } from './registry';

const DEFAULT_BASE_URL = 'https://ai-gateway.vercel.sh/v1';
const DEFAULT_TIMEOUT_MS = 60000;

export type VercelGatewayProviderConfig = { apiKey?: string; baseUrl?: string; defaultModel?: string; timeoutMs?: number };

/**
 * Vercel AI Gateway provider adapter.
 * OpenAI-compatible endpoint at ai-gateway.vercel.sh.
 * $5/month free credit. 275+ models from 25+ providers.
 * Pass-through pricing at provider rates with zero markup.
 */
export class VercelGatewayProvider implements IProvider {
  name = 'vercel-gateway';
  private apiKey: string; private baseUrl: string; private defaultModel: string; private timeoutMs: number;

  constructor(config: VercelGatewayProviderConfig = {}) {
    this.apiKey = config.apiKey || ''; this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || 'openai/gpt-4o-mini'; this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const res = await fetch(`${this.baseUrl}/models`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(this.timeoutMs) });
      return res.ok;
    } catch { return false; }
  }

  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    try {
      const res = await this.fetchJson<{ data: Array<{ id: string; context_length?: number; capabilities?: string[]; modalities?: string[] }> }>(`${this.baseUrl}/models`);
      return (res.data || []).map(m => ({
        id: m.id, name: m.id, contextWindow: m.context_length || 128000,
        capabilities: m.modalities?.includes('image') ? ['chat', 'completion', 'vision'] : (m.capabilities || ['chat', 'completion']),
      }));
    } catch { return []; }
  }

  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const payload = this.buildPayload(request, false);
    const res = await this.fetchJson<Record<string, unknown>>(`${this.baseUrl}/chat/completions`, { method: 'POST', body: JSON.stringify(payload) });
    if ((res as any).error) throw new Error(String((res as any).error?.message || 'Vercel Gateway error'));
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
    if (!res.ok) { const t = await res.text(); throw new Error(`Vercel Gateway stream error: ${res.status} ${t}`); }
    const reader = res.body?.getReader(); if (!reader) throw new Error('No body');
    const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data: ')) continue; const d = t.slice(6).trim(); if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d); const c = p.choices?.[0];
          if (c?.delta?.content) await onChunk({ id: p.id, object: 'chat.completion.chunk', created: p.created, model: p.model, choices: [{ index: 0, delta: { content: c.delta.content }, finish_reason: c.finish_reason || null }] });
        } catch { /* skip */ }
      }
    }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const s = Date.now();
    try { await this.fetchJson(`${this.baseUrl}/models`); return { healthy: true, latencyMs: Date.now() - s }; }
    catch (e) { return { healthy: false, error: e instanceof Error ? e.message : String(e) }; }
  }

  async estimateCost(_i: number, _o: number): Promise<number | null> { return 0; } // $5/mo free credit

  private buildPayload(r: Record<string, unknown>, stream: boolean): Record<string, unknown> {
    return { model: String(r.model || this.defaultModel), messages: Array.isArray(r.messages) ? r.messages : [], stream, temperature: Number(r.temperature ?? 0.7), max_tokens: Number(r.max_tokens ?? r.maxTokens ?? 4096) };
  }

  private async fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`, ...((init?.headers as Record<string, string>) || {}) }, signal: AbortSignal.timeout(this.timeoutMs) });
    if (!res.ok) { const t = await res.text(); throw new Error(`Vercel Gateway error ${res.status}: ${t}`); }
    return res.json() as Promise<T>;
  }
}

export function createVercelGatewayProvider(config?: VercelGatewayProviderConfig): VercelGatewayProvider { return new VercelGatewayProvider(config); }
