import { IProvider } from './registry';
export type OpenAiProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
export declare class OpenAiProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: OpenAiProviderConfig);
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
export declare function createOpenAiProvider(config?: OpenAiProviderConfig): OpenAiProvider;
