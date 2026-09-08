"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqProvider = void 0;
exports.createGroqProvider = createGroqProvider;
const DEFAULT_BASE_URL = 'https://api.groq.com/openai/v1';
const DEFAULT_TIMEOUT_MS = 30000;
/**
 * Groq provider adapter.
 * OpenAI-compatible endpoint. Extremely fast inference.
 * Exposes rate-limit headers: x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, etc.
 */
class GroqProvider {
    name = 'groq';
    apiKey;
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = config.defaultModel || 'llama-3.3-70b-versatile';
        this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    }
    async authenticate(_config) {
        if (!this.apiKey)
            return false;
        try {
            const res = await this.fetchJson(`${this.baseUrl}/models`);
            return res.object === 'list' || Array.isArray(res);
        }
        catch {
            return false;
        }
    }
    async listModels() {
        const res = await this.fetchJson(`${this.baseUrl}/models`);
        return (res.data || []).map(m => ({
            id: m.id,
            name: m.id,
            contextWindow: m.context_window || 128000,
            capabilities: m.capabilities || ['chat', 'completion'],
        }));
    }
    async complete(request) {
        const payload = this.buildPayload(request, false);
        const res = await this.fetchJson(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        if (res.error)
            throw new Error(String(res.error?.message || 'Groq API error'));
        return res;
    }
    async stream(request, onChunk) {
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
        if (!reader)
            throw new Error('No response body stream');
        const decoder = new TextDecoder();
        let buffer = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data: '))
                    continue;
                const data = trimmed.slice(6).trim();
                if (data === '[DONE]')
                    continue;
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
                }
                catch { /* skip */ }
            }
        }
    }
    async healthCheck() {
        const start = Date.now();
        try {
            await this.fetchJson(`${this.baseUrl}/models`);
            return { healthy: true, latencyMs: Date.now() - start };
        }
        catch (err) {
            return { healthy: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
    async estimateCost(_inputTokens, _outputTokens) {
        return 0; // free tier
    }
    buildPayload(request, stream) {
        return {
            model: String(request.model || this.defaultModel),
            messages: Array.isArray(request.messages) ? request.messages : [],
            stream,
            temperature: Number(request.temperature ?? 0.7),
            max_tokens: Number(request.max_tokens ?? request.maxTokens ?? 4096),
        };
    }
    async fetchJson(url, init) {
        const res = await fetch(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`, ...(init?.headers || {}) },
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Groq error ${res.status}: ${text}`);
        }
        return res.json();
    }
}
exports.GroqProvider = GroqProvider;
function createGroqProvider(config) {
    return new GroqProvider(config);
}
//# sourceMappingURL=groq.js.map