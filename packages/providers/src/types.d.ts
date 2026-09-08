export interface ProviderConfig {
    name: string;
    baseUrl?: string;
    apiKey?: string;
    defaultModel?: string;
    timeoutMs?: number;
}
export interface StreamingChunk {
    delta: string;
    role?: string;
    toolCalls?: unknown[];
    finishReason?: string;
}
export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
export interface ProviderHealth {
    state: HealthState;
    successRate: number;
    failureRate: number;
    averageLatencyMs: number;
    recentFailures: number;
    lastSuccess: number | null;
    lastFailure: number | null;
}
export interface ModelCapabilities {
    contextWindow: number;
    capabilities: string[];
    inputPrice?: number;
    outputPrice?: number;
}
export interface CompletionRequest {
    model: string;
    messages: unknown[];
    temperature?: number;
    maxTokens?: number;
    stop?: string | string[];
    stream?: boolean;
    tools?: unknown[];
    toolChoice?: string;
}
export interface CompletionResponse {
    id: string;
    model: string;
    choices: unknown[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    error?: string;
}
