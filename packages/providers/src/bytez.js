"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BytezProvider = void 0;
exports.createBytezProvider = createBytezProvider;
const DEFAULT_BASE_URL = 'https://api.bytez.ai/v1';
const DEFAULT_TIMEOUT_MS = 60000;
class BytezProvider {
    name = 'bytez';
    apiKey;
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.apiKey = config.apiKey || '';
        this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
        this.defaultModel = config.defaultModel || 'bytez-pro';
        this.timeoutMs = config.timeoutMs || DEFAULT_TIMEOUT_MS;
    }
    async authenticate(_config) {
        if (!this.apiKey)
            return false;
        try {
            const res = await this.fetchJson(`${this.baseUrl}/models`, { method: 'GET' });
            return !res.error && Array.isArray(res.models);
        }
        catch {
            return false;
        }
    }
    async listModels() {
        const res = await this.fetchJson(`${this.baseUrl}/models`, { method: 'GET' });
        const list = Array.isArray(res) ? res : [];
        return list.map((m) => ({
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
        if (res.error) {
            throw new Error(String(res.error?.message || 'Bytez API error'));
        }
        const choice = res.choices?.[0];
        const usage = res.usage || {};
        return {
            id: res.id || `bytez-${Date.now()}`,
            object: 'chat.completion',
            created: res.created || Math.floor(Date.now() / 1000),
            model: payload.model,
            choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: (choice?.message?.content || ''),
                    },
                    finish_reason: choice?.finish_reason || 'stop',
                }],
            usage: {
                prompt_tokens: (usage.prompt_tokens || 0),
                completion_tokens: (usage.completion_tokens || 0),
                total_tokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
            },
        };
    }
    async stream(request, onChunk) {
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
            throw new Error(`Bytez stream error: ${res.status} ${text}`);
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
                    const chunk = this.normalizeChunk(parsed);
                    await onChunk(chunk);
                }
                catch {
                    // skip malformed lines
                }
            }
        }
    }
    async healthCheck() {
        const start = Date.now();
        try {
            await this.fetchJson(`${this.baseUrl}/models`, { method: 'GET' });
            return { healthy: true, latencyMs: Date.now() - start };
        }
        catch (err) {
            return { healthy: false, error: err instanceof Error ? err.message : String(err) };
        }
    }
    async estimateCost(inputTokens, outputTokens) {
        // Bytez pricing (approximate): $0.50/1M input, $1.50/1M output
        const inputCost = (inputTokens / 1_000_000) * 0.50;
        const outputCost = (outputTokens / 1_000_000) * 1.50;
        return inputCost + outputCost;
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
    normalizeChunk(parsed) {
        const choice = parsed.choices?.[0];
        const delta = choice?.delta || {};
        return {
            id: parsed.id || `bytez-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: parsed.created || Math.floor(Date.now() / 1000),
            model: parsed.model || 'bytez-pro',
            choices: [{
                    index: choice?.index || 0,
                    delta: {
                        content: delta.content || undefined,
                        role: delta.role || undefined,
                    },
                    finish_reason: choice?.finish_reason || null,
                }],
        };
    }
    async fetchJson(url, init) {
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...(init?.headers || {}),
        };
        const res = await fetch(url, {
            ...init,
            headers,
            signal: init?.signal || AbortSignal.timeout(this.timeoutMs),
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Bytez error ${res.status}: ${text}`);
        }
        return res.json();
    }
}
exports.BytezProvider = BytezProvider;
function createBytezProvider(config) {
    return new BytezProvider(config);
}
//# sourceMappingURL=bytez.js.map