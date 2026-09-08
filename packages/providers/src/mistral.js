"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralProvider = void 0;
exports.createMistralProvider = createMistralProvider;
const DEFAULT_BASE_URL = 'https://api.mistral.ai/v1';
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * Mistral AI provider adapter.
 * OpenAI-compatible endpoint. Free tier available.
 */
class MistralProvider {
    name = 'mistral';
    apiKey;
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = config.defaultModel || 'mistral-small-latest';
        this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    }
    async authenticate() { if (!this.apiKey)
        return false; try {
        const r = await this.fetchJson(`${this.baseUrl}/models`);
        return !!r;
    }
    catch {
        return false;
    } }
    async listModels() {
        const res = await this.fetchJson(`${this.baseUrl}/models`);
        return (res.data || []).map(m => ({ id: m.id, name: m.id, contextWindow: 128000, capabilities: m.capabilities || ['chat', 'completion'] }));
    }
    async complete(request) {
        const payload = this.buildPayload(request, false);
        const res = await this.fetchJson(`${this.baseUrl}/chat/completions`, { method: 'POST', body: JSON.stringify(payload) });
        if (res.error)
            throw new Error(String(res.error?.message || 'Mistral error'));
        return res;
    }
    async stream(request, onChunk) {
        const payload = this.buildPayload(request, true);
        const res = await fetch(`${this.baseUrl}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` }, body: JSON.stringify(payload), signal: AbortSignal.timeout(this.timeoutMs) });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Mistral stream error: ${res.status} ${t}`);
        }
        const reader = res.body?.getReader();
        if (!reader)
            throw new Error('No body');
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buf += dec.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() || '';
            for (const line of lines) {
                const t = line.trim();
                if (!t.startsWith('data: '))
                    continue;
                const d = t.slice(6).trim();
                if (d === '[DONE]')
                    continue;
                try {
                    const p = JSON.parse(d);
                    const c = p.choices?.[0];
                    if (c?.delta?.content)
                        await onChunk({ id: p.id, object: 'chat.completion.chunk', created: p.created, model: p.model, choices: [{ index: 0, delta: { content: c.delta.content }, finish_reason: c.finish_reason || null }] });
                }
                catch { /* skip */ }
            }
        }
    }
    async healthCheck() {
        const s = Date.now();
        try {
            await this.fetchJson(`${this.baseUrl}/models`);
            return { healthy: true, latencyMs: Date.now() - s };
        }
        catch (e) {
            return { healthy: false, error: e instanceof Error ? e.message : String(e) };
        }
    }
    async estimateCost(_i, _o) { return 0; }
    buildPayload(r, stream) {
        return { model: String(r.model || this.defaultModel), messages: Array.isArray(r.messages) ? r.messages : [], stream, temperature: Number(r.temperature ?? 0.7), max_tokens: Number(r.max_tokens ?? r.maxTokens ?? 4096) };
    }
    async fetchJson(url, init) {
        const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`, ...(init?.headers || {}) }, signal: AbortSignal.timeout(this.timeoutMs) });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Mistral error ${res.status}: ${t}`);
        }
        return res.json();
    }
}
exports.MistralProvider = MistralProvider;
function createMistralProvider(config) { return new MistralProvider(config); }
//# sourceMappingURL=mistral.js.map