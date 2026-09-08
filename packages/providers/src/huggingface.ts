import { IProvider } from './registry';

const DEFAULT_BASE_URL = 'https://api-inference.huggingface.co';
const DEFAULT_TIMEOUT_MS = 60000;

export type HuggingFaceProviderConfig = { apiKey?: string; baseUrl?: string; defaultModel?: string; timeoutMs?: number };

/**
 * Hugging Face Inference Providers adapter.
 * Free tier: $0.10/month credit. Aggregates 200+ models via multiple providers.
 * Treated as an aggregation/overflow source.
 */
export class HuggingFaceProvider implements IProvider {
  name = 'huggingface';
  private apiKey: string; private baseUrl: string; private defaultModel: string; private timeoutMs: number;

  constructor(config: HuggingFaceProviderConfig = {}) {
    this.apiKey = config.apiKey || ''; this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
    this.defaultModel = config.defaultModel || 'meta-llama/Llama-3.3-70B-Instruct'; this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  async authenticate(): Promise<boolean> { if (!this.apiKey) return false; try { const r = await fetch(`${this.baseUrl}/models`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(this.timeoutMs) }); return r.ok; } catch { return false; } }
  async listModels(): Promise<Array<{ id: string; name: string; contextWindow: number; capabilities: string[] }>> {
    // HF doesn't have a simple models list endpoint for inference; return well-known models
    return [
      { id: 'meta-llama/Llama-3.3-70B-Instruct', name: 'Llama 3.3 70B', contextWindow: 128000, capabilities: ['chat', 'completion'] },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B', contextWindow: 128000, capabilities: ['chat', 'completion'] },
      { id: 'mistralai/Mistral-7B-Instruct-v0.3', name: 'Mistral 7B', contextWindow: 32768, capabilities: ['chat', 'completion'] },
    ];
  }
  async complete(request: Record<string, unknown>): Promise<Record<string, unknown>> {
    const model = String(request.model || this.defaultModel);
    const messages = Array.isArray(request.messages) ? request.messages : [];
    const lastMsg = messages[messages.length - 1] as { content?: string } | undefined;
    const prompt = String(lastMsg?.content || '');

    const res = await fetch(`${this.baseUrl}/models/${model}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096), temperature: Number(request.temperature ?? 0.7) } }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) { const t = await res.text(); throw new Error(`HuggingFace error ${res.status}: ${t}`); }
    const data = await res.json() as Array<{ generated_text?: string }> | { error?: string };
    const text = Array.isArray(data) ? data[0]?.generated_text || '' : (data as any).generated_text || '';
    return { id: `hf-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }], usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } };
  }
  async stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void> {
    // HF inference API doesn't support true streaming via this endpoint; fall back to complete
    const result = await this.complete(request);
    const content = (result as any).choices?.[0]?.message?.content || '';
    if (content) await onChunk({ id: `hf-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model: String(request.model || this.defaultModel), choices: [{ index: 0, delta: { content }, finish_reason: 'stop' }] });
  }
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const s = Date.now(); try { const r = await fetch(this.baseUrl, { signal: AbortSignal.timeout(this.timeoutMs) }); return { healthy: r.ok, latencyMs: Date.now() - s }; } catch (e) { return { healthy: false, error: e instanceof Error ? e.message : String(e) }; }
  }
  async estimateCost(_i: number, _o: number): Promise<number | null> { return 0; }
}

export function createHuggingFaceProvider(config?: HuggingFaceProviderConfig): HuggingFaceProvider { return new HuggingFaceProvider(config); }
