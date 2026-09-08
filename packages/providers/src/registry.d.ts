export interface IProvider {
    name: string;
    authenticate(config: Record<string, unknown>): Promise<boolean>;
    listModels(): Promise<Array<{
        id: string;
        name: string;
        contextWindow: number;
        capabilities: string[];
    }>>;
    complete(request: unknown): Promise<unknown>;
    stream(request: unknown, onChunk: (chunk: unknown) => void | Promise<void>): Promise<unknown>;
    healthCheck(): Promise<{
        healthy: boolean;
        latencyMs?: number;
        error?: string;
    }>;
    estimateCost(inputTokens: number, outputTokens: number): Promise<number | null>;
}
export interface ProviderRegistryConfig {
    defaultProvider?: string;
    providers?: Array<{
        name: string;
        enabled: boolean;
    }>;
}
export declare class ProviderRegistry {
    private providers;
    private providerOrder;
    private defaultProvider?;
    constructor(config?: ProviderRegistryConfig);
    register(provider: IProvider): void;
    getProvider(name: string): IProvider | undefined;
    listProviders(): string[];
    getDefaultProvider(): string | undefined;
    setDefaultProvider(name: string): void;
    getProviderCount(): number;
    clear(): void;
}
export declare function createDefaultRegistry(): ProviderRegistry;
