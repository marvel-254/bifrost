"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareProvider = void 0;
exports.createCloudflareProvider = createCloudflareProvider;
const DEFAULT_BASE_URL = 'https://api.cloudflare.com/client/v4';
const DEFAULT_TIMEOUT_MS = 30000;
/**
 * Cloudflare Workers AI provider adapter.
 * Uses the REST API for Workers AI inference.
 * Free tier: 10,000 neurons/day.
 */
class CloudflareProvider {
    name = 'cloudflare';
    accountId;
    apiKey;
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.accountId = config.accountId || '';
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = config.defaultModel || '@cf/meta/llama-3.3-70b-instruct-fp16';
        this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    }
    async authenticate() {
        if (!this.apiKey || !this.accountId)
            return false;
        try {
            const r = await fetch(`${this.baseUrl}/accounts/${this.accountId}/ai/models/search`, { headers: { Authorization: `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(this.timeoutMs) });
            return r.ok;
        }
        catch {
            return false;
        }
    }
    async listModels() {
        try {
            const res = await this.fetchJson(`/accounts/${this.accountId}/ai/models/search`);
            return (res.result || []).map(m => ({ id: m.id, name: m.name || m.id, contextWindow: 128000, capabilities: ['chat', 'completion'] }));
        }
        catch {
            return [];
        }
    }
    async complete(request) {
        const model = String(request.model || this.defaultModel);
        const messages = Array.isArray(request.messages) ? request.messages : [];
        const res = await this.fetchJson(`/accounts/${this.accountId}/ai/run/${model}`, {
            method: 'POST', body: JSON.stringify({ messages, stream: false, max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096), temperature: Number(request.temperature ?? 0.7) }),
        });
        const result = (res.result || {});
        return {
            id: `cf-${Date.now()}`, object: 'chat.completion', created: Math.floor(Date.now() / 1000), model,
            choices: [{ index: 0, message: { role: 'assistant', content: result.response || '' }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        };
    }
    async stream(request, onChunk) {
        const model = String(request.model || this.defaultModel);
        const messages = Array.isArray(request.messages) ? request.messages : [];
        const res = await fetch(`${this.baseUrl}/accounts/${this.accountId}/ai/run/${model}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
            body: JSON.stringify({ messages, stream: true, max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096), temperature: Number(request.temperature ?? 0.7) }),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Cloudflare stream error: ${res.status} ${t}`);
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
                    if (p.response)
                        await onChunk({ id: `cf-${Date.now()}`, object: 'chat.completion.chunk', created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta: { content: p.response }, finish_reason: null }] });
                }
                catch { /* skip */ }
            }
        }
    }
    async healthCheck() {
        const s = Date.now();
        try {
            await this.authenticate();
            return { healthy: true, latencyMs: Date.now() - s };
        }
        catch (e) {
            return { healthy: false, error: e instanceof Error ? e.message : String(e) };
        }
    }
    async estimateCost(_i, _o) { return 0; }
    async fetchJson(path, init) {
        const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}`, ...(init?.headers || {}) }, signal: AbortSignal.timeout(this.timeoutMs) });
        if (!res.ok) {
            const t = await res.text();
            throw new Error(`Cloudflare error ${res.status}: ${t}`);
        }
        return res.json();
    }
}
exports.CloudflareProvider = CloudflareProvider;
function createCloudflareProvider(config) { return new CloudflareProvider(config); }
//# sourceMappingURL=cloudflare.js.map