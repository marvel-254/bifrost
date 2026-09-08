import { IProvider } from './registry';
export declare class OllamaProvider implements IProvider {
    name: string;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: {
        baseUrl?: string;
        defaultModel?: string;
        timeoutMs?: number;
    });
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
    private buildChatPayload;
    private normalizeChunk;
    private inferCapabilities;
    private fetchJson;
}
export declare function createOllamaProvider(config?: {
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
}): OllamaProvider;
