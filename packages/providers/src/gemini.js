"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiProvider = void 0;
exports.createGeminiProvider = createGeminiProvider;
const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_TIMEOUT_MS = 60000;
/**
 * Google Gemini provider adapter.
 * Uses the OpenAI-compatible endpoint at generativelanguage.googleapis.com.
 */
class GeminiProvider {
    name = 'gemini';
    apiKey;
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = config.defaultModel || 'gemini-2.0-flash';
        this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    }
    async authenticate(_config) {
        if (!this.apiKey)
            return false;
        try {
            const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
                signal: AbortSignal.timeout(this.timeoutMs),
            });
            return res.ok;
        }
        catch {
            return false;
        }
    }
    async listModels() {
        const res = await this.fetchJson(`/models?key=${this.apiKey}`);
        return (res.models || [])
            .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
            .map(m => ({
            id: m.name.replace('models/', ''),
            name: m.displayName || m.name.replace('models/', ''),
            contextWindow: m.inputTokenLimit || 128000,
            capabilities: ['chat', 'completion'],
        }));
    }
    async complete(request) {
        const model = String(request.model || this.defaultModel);
        const messages = Array.isArray(request.messages) ? request.messages : [];
        const contents = this.toGeminiMessages(messages);
        const res = await this.fetchJson(`/models/${model}:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: Number(request.temperature ?? 0.7),
                    maxOutputTokens: Number(request.max_tokens ?? request.maxTokens ?? 4096),
                },
            }),
        });
        const candidates = (res.candidates || []);
        const text = candidates[0]?.content?.parts?.[0]?.text || '';
        const usageMetadata = res.usageMetadata;
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
    async stream(request, onChunk) {
        const model = String(request.model || this.defaultModel);
        const messages = Array.isArray(request.messages) ? request.messages : [];
        const contents = this.toGeminiMessages(messages);
        const res = await fetch(`${this.baseUrl}/models/${model}:streamGenerateContent?key=${this.apiKey}&alt=sse`, {
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
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Gemini stream error: ${res.status} ${text}`);
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
                    const candidates = (parsed.candidates || []);
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
                }
                catch {
                    // skip malformed
                }
            }
        }
    }
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`, {
                signal: AbortSignal.timeout(this.timeoutMs),
            });
            return { healthy: res.ok, latencyMs: Date.now() - start };
        }
        catch (err) {
            return { healthy: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
    async estimateCost(inputTokens, outputTokens) {
        // Gemini 2.0 Flash free tier: $0
        const inputCost = (inputTokens / 1_000_000) * 0;
        const outputCost = (outputTokens / 1_000_000) * 0;
        return inputCost + outputCost;
    }
    toGeminiMessages(messages) {
        return messages
            .filter((m) => typeof m === 'object' && m !== null && 'role' in m && 'content' in m)
            .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.content) }],
        }));
    }
    async fetchJson(path, init) {
        const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
        const res = await fetch(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Gemini error ${res.status}: ${text}`);
        }
        return res.json();
    }
}
exports.GeminiProvider = GeminiProvider;
function createGeminiProvider(config) {
    return new GeminiProvider(config);
}
//# sourceMappingURL=gemini.js.map