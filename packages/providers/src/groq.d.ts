import { IProvider } from './registry';
export type GroqProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Groq provider adapter.
 * OpenAI-compatible endpoint. Extremely fast inference.
 * Exposes rate-limit headers: x-ratelimit-remaining-requests, x-ratelimit-remaining-tokens, etc.
 */
export declare class GroqProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: GroqProviderConfig);
    authenticate(_config: Record<string, unknown>): Promise<boolean>;
    listModels(): Promise<Array<{
        id: string;
        name: string;
        contextWindow: number;
        capabilities: string[];
    }>>;
    complete(request: Record<string, unknown>): Promise<Record<string, unknown>>;
    stream(request: Record<string, unknown>, onChunk: (chunk: Record<string, unknown>) => void | Promise<void>): Promise<void>;
    healthCheck(): Promise<{
        healthy: boolean;
        latencyMs?: number;
        error?: string;
    }>;
    estimateCost(_inputTokens: number, _outputTokens: number): Promise<number | null>;
    private buildPayload;
    private fetchJson;
}
export declare function createGroqProvider(config?: GroqProviderConfig): GroqProvider;
