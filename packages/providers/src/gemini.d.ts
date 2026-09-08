import { IProvider } from './registry';
export type GeminiProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Google Gemini provider adapter.
 * Uses the OpenAI-compatible endpoint at generativelanguage.googleapis.com.
 */
export declare class GeminiProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: GeminiProviderConfig);
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
    estimateCost(inputTokens: number, outputTokens: number): Promise<number | null>;
    private toGeminiMessages;
    private fetchJson;
}
export declare function createGeminiProvider(config?: GeminiProviderConfig): GeminiProvider;
