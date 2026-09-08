import { IProvider } from './registry';
export type CerebrasProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Cerebras provider adapter.
 * OpenAI-compatible endpoint. Ultra-low latency inference.
 */
export declare class CerebrasProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: CerebrasProviderConfig);
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
    estimateCost(_i: number, _o: number): Promise<number | null>;
    private buildPayload;
    private fetchJson;
}
export declare function createCerebrasProvider(config?: CerebrasProviderConfig): CerebrasProvider;
