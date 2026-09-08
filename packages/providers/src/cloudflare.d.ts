import { IProvider } from './registry';
export type CloudflareProviderConfig = {
    accountId?: string;
    apiKey?: string;
    baseUrl?: string;
    defaultModel?: string;
    timeoutMs?: number;
};
/**
 * Cloudflare Workers AI provider adapter.
 * Uses the REST API for Workers AI inference.
 * Free tier: 10,000 neurons/day.
 */
export declare class CloudflareProvider implements IProvider {
    name: string;
    private accountId;
    private apiKey;
    private baseUrl;
    private defaultModel;
    private timeoutMs;
    constructor(config?: CloudflareProviderConfig);
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
    private fetchJson;
}
export declare function createCloudflareProvider(config?: CloudflareProviderConfig): CloudflareProvider;
