import { IProvider } from './registry';
export type OpenRouterProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * OpenRouter provider adapter.
 * OpenAI-compatible. Aggregator of many providers.
 * Free models available via :free suffix.
 */
export declare class OpenRouterProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: OpenRouterProviderConfig);
    authenticate(): Promise<boolean>;
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
    estimateCost(_i: number, _o: number): Promise<number | null>;
    private buildPayload;
    private fetchJson;
}
export declare function createOpenRouterProvider(config?: OpenRouterProviderConfig): OpenRouterProvider;
