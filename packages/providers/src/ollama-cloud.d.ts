import { IProvider } from './registry';
export type OllamaCloudProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Ollama Cloud provider adapter.
 *
 * Uses the OpenAI-compatible endpoint at api.ollama.com/v1.
 * Requires an Ollama Cloud API key (OLLAMA_CLOUD_API_KEY or passed in config).
 *
 * Differs from the self-hosted `ollama` provider which hits a local
 * Ollama instance at http://localhost:11434 with no auth.
 */
export declare class OllamaCloudProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: OllamaCloudProviderConfig);
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
    private buildPayload;
    private normalizeChunk;
    private fetchJson;
}
export declare function createOllamaCloudProvider(config?: OllamaCloudProviderConfig): OllamaCloudProvider;
