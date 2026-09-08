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
