"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
exports.createOllamaProvider = createOllamaProvider;
const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
const OLLAMA_TIMEOUT_MS = 30000;
class OllamaProvider {
    name = 'ollama';
    baseUrl;
    defaultModel;
    timeoutMs;
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || OLLAMA_DEFAULT_URL.replace(/\/+$/, '');
        this.defaultModel = config.defaultModel || 'llama3';
        this.timeoutMs = config.timeoutMs || OLLAMA_TIMEOUT_MS;
    }
    async authenticate(_config) {
        try {
            const result = await this.healthCheck();
            return result.healthy;
        }
        catch {
            return false;
        }
    }
    async listModels() {
        const response = await this.fetchJson(`${this.baseUrl}/api/tags`);
        const models = [];
        const list = response.models || [];
        for (const model of list) {
            models.push({
                id: model.name,
                name: model.name,
                contextWindow: model.model?._meta?.context_window || 8192,
                capabilities: this.inferCapabilities(model.name),
            });
        }
        return models;
    }
    async complete(request) {
        const payload = this.buildChatPayload(request, false);
        const response = await this.fetchJson(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (response.error) {
            throw new Error(String(response.error));
        }
        const msg = response.message || {};
        const usage = response.usage || {};
        return {
            id: `ollama-${Date.now()}`,
            model: payload.model,
            choices: [{
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: msg.content || '',
                    },
                    finish_reason: msg.tool_calls ? 'tool_calls' : 'stop',
                }],
            usage: {
                promptTokens: usage.prompt_tokens || 0,
                completionTokens: usage.completion_tokens || 0,
                totalTokens: (usage.prompt_tokens || 0) + (usage.completion_tokens || 0),
            },
        };
    }
    async stream(request, onChunk) {
        const payload = this.buildChatPayload(request, true);
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Ollama stream error: ${response.status} ${text}`);
        }
        const reader = response.body?.getReader();
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
                    // Skip malformed lines
                }
            }
        }
    }
    async healthCheck() {
        const start = Date.now();
        try {
            await this.fetchJson(`${this.baseUrl}/api/tags`);
            return { healthy: true, latencyMs: Date.now() - start };
        }
        catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            return { healthy: false, error };
        }
    }
    async estimateCost(_inputTokens, _outputTokens) {
        return 0;
    }
    buildChatPayload(request, stream) {
        return {
            model: String(request.model || this.defaultModel),
            messages: Array.isArray(request.messages) ? request.messages : [],
            stream,
            options: {
                temperature: Number(request.temperature ?? 0.7),
                num_predict: Number(request.maxTokens ?? 4096),
            },
        };
    }
    normalizeChunk(parsed) {
        const message = parsed.message;
        const delta = {};
        if (message?.content) {
            delta.content = String(message.content);
        }
        if (message?.role) {
            delta.role = String(message.role);
        }
        const toolCalls = message?.tool_calls;
        if (Array.isArray(toolCalls) && toolCalls.length > 0) {
            delta.tool_calls = toolCalls;
        }
        return {
            id: parsed.id || `ollama-${Date.now()}`,
            object: 'chat.completion.chunk',
            created: parsed.created_at ? new Date(parsed.created_at).getTime() / 1000 : Math.floor(Date.now() / 1000),
            model: parsed.model || this.defaultModel,
            choices: [{
                    index: 0,
                    delta,
                    finish_reason: parsed.done ? 'stop' : null,
                }],
        };
    }
    inferCapabilities(modelName) {
        const name = modelName.toLowerCase();
        const caps = ['chat', 'completion'];
        if (name.includes('vision') || name.includes('vl') || name.includes('llava') || name.includes('gemma 3'))
            caps.push('vision');
        if (name.includes('tool') || name.includes('function') || name.includes('agent'))
            caps.push('tool_use');
        return caps;
    }
    async fetchJson(url, init) {
        const res = await fetch(url, {
            ...init,
            signal: init?.signal || AbortSignal.timeout(this.timeoutMs),
        });
        return res.json();
    }
}
exports.OllamaProvider = OllamaProvider;
function createOllamaProvider(config) {
    return new OllamaProvider(config);
}
//# sourceMappingURL=ollama.js.map