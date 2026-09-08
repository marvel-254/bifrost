import { IProvider } from './registry';
export type HuggingFaceProviderConfig = {
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Hugging Face Inference Providers adapter.
 * Free tier: $0.10/month credit. Aggregates 200+ models via multiple providers.
 * Treated as an aggregation/overflow source.
 */
export declare class HuggingFaceProvider implements IProvider {
    name: string;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: HuggingFaceProviderConfig);
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
}
export declare function createHuggingFaceProvider(config?: HuggingFaceProviderConfig): HuggingFaceProvider;
