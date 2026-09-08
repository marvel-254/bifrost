export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: ChatTool[];
  tool_choice?: 'auto' | 'none' | 'required';
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
    tool_calls?: ChatToolCall[];
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  capabilities: string[];
  inputPrice?: number;
  outputPrice?: number;
  enabled: boolean;
}

export interface ProviderHealth {
  state: 'healthy' | 'degraded' | 'unhealthy' | 'disabled';
  successRate: number;
  failureRate: number;
  averageLatencyMs: number;
  recentFailures: number;
  lastSuccess: number | null;
  lastFailure: number | null;
}

export interface RoutingCandidate {
  model: ModelInfo;
  provider: string;
  qualityScore: number;
  costScore: number;
  latencyScore: number;
  reliabilityScore: number;
  availabilityScore: number;
  priority: number;
  score?: number;
}

export type RoutingStrategy = 'manual' | 'priority' | 'cheapest' | 'fastest' | 'balanced';

export interface RoutingConfig {
  strategy: RoutingStrategy;
  weights?: {
    capabilityMatch: number;
    quality: number;
    reliability: number;
    costEfficiency: number;
    latency: number;
    availability: number;
  };
  maxAttempts: number;
  fallbackModels: string[];
}

export interface RoutingConstraints {
  requiredCapabilities?: string[];
  minContextWindow?: number;
  maxCostPerRequest?: number;
  disabledProviders?: string[];
  disabledModels?: string[];
}

export interface BifrostError {
  code: string;
  message: string;
  status: number;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'CLIENT_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'VALIDATION_ERROR'
  | 'PROVIDER_ERROR'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'ROUTING_FAILURE'
  | 'CONFIGURATION_ERROR'
  | 'INTERNAL_ERROR';

// ── Normalized provider types ────────────────────────────────────────────────
// These types define the canonical contract between the routing layer and
// provider adapters. Adapters translate provider-specific payloads into these
// normalized forms so the router never contains provider-specific logic.

export interface NormalizedMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

export interface NormalizedRequest {
  model: string;
  messages: NormalizedMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  tools?: ChatTool[];
  tool_choice?: 'auto' | 'none' | 'required';
  user?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface NormalizedChoice {
  index: number;
  message: NormalizedMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface NormalizedResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: NormalizedChoice[];
  usage?: NormalizedUsage;
  provider?: string;
  cost?: number;
  costType?: 'exact' | 'estimated' | 'unknown';
}

export interface NormalizedStreamDelta {
  role?: string;
  content?: string;
  tool_calls?: ChatToolCall[];
}

export interface NormalizedStreamChoice {
  index: number;
  delta: NormalizedStreamDelta;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface NormalizedStreamEvent {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: NormalizedStreamChoice[];
  provider?: string;
}

export interface NormalizedEmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface NormalizedEmbedding {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface NormalizedEmbeddingResponse {
  object: 'list';
  data: NormalizedEmbedding[];
  model: string;
  usage?: NormalizedUsage;
}

export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  tools: boolean;
  vision: boolean;
  embeddings: boolean;
  contextWindow: number;
}

export interface ProviderError {
  code: ErrorCode;
  message: string;
  status: number;
  provider: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * ProviderAdapter — the canonical interface all provider adapters must implement.
 *
 * The routing layer only ever interacts with this interface. Provider-specific
 * HTTP, auth, payload translation, streaming normalization, and error mapping
 * live inside each adapter.
 */
export interface ProviderAdapter {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * Execute a non-streaming chat completion.
   * Throws a {@link ProviderError} on failure (already normalized).
   */
  chat(request: NormalizedRequest): Promise<NormalizedResponse>;

  /**
   * Execute a streaming chat completion.
   * Yields normalized stream events. Throws a {@link ProviderError} on failure.
   */
  stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;

  /**
   * Generate embeddings (optional — adapters may throw if unsupported).
   */
  embeddings(request: NormalizedEmbeddingRequest): Promise<NormalizedEmbeddingResponse>;

  /**
   * Return a health probe result for this provider.
   */
  health(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }>;

  /**
   * Estimate cost for a given token count.
   * Returns `null` when cost is unknown.
   */
  estimateCost(inputTokens: number, outputTokens: number): Promise<number | null>;
}
