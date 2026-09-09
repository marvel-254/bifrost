export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type CooldownReason =
  | 'rate_limit'
  | 'server_error'
  | 'timeout'
  | 'auth_failure'
  | 'context_too_large'
  | 'unsupported_tool';

export type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type ProviderErrorCategory =
  | 'rate_limit_429'
  | 'server_error_5xx'
  | 'timeout'
  | 'connection_failure'
  | 'auth_failure'
  | 'context_too_large'
  | 'unsupported_tool'
  | 'unknown';

// ── Circuit Breaker ────────────────────────────────────────────────────────────

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeoutThreshold: number;
  recoveryTimeout: number;
  probeFrequency: number;
  threshold429: number;
  threshold5xx: number;
  thresholdTimeout: number;
  thresholdConnection: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure: number | null;
  lastSuccess: number | null;
}

export interface CircuitBreakerEntry {
  config: CircuitBreakerConfig;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailure: number | null;
  lastSuccess: number | null;
  openedAt: number | null;
  lastProbeAt: number | null;
}

// ── Cooldown ──────────────────────────────────────────────────────────────────

export interface CooldownConfig {
  defaultDurationMs: number;
  escalation429: number[];
  escalation5xx: number[];
  escalationTimeout: number[];
  escalationAuth: number;
}

export interface CooldownEntry {
  reason: CooldownReason;
  expiresAt: number;
  level: number;
  disableProvider?: boolean;
}

// ── Fallback ──────────────────────────────────────────────────────────────────

export type FallbackStrategy =
  | 'rotate_account'
  | 'alternate_provider'
  | 'compress_and_retry'
  | 'larger_context_model'
  | 'capability_compatible_model'
  | 'retry'
  | 'none';

export interface FallbackConfig {
  maxAttempts: number;
}

export type { RoutingCandidate } from '@bifrost/routing';

// ── Self-Healing ──────────────────────────────────────────────────────────────

export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'disabled' | 'quarantined';

export interface HealthThresholds {
  successRateDrop: number;
  latencySpikeMultiplier: number;
  errorRateIncrease: number;
  degradedSuccessRate: number;
  unhealthySuccessRate: number;
  recoverySuccessRate: number;
  probeLatencyMs: number;
}

export interface HealthRecord {
  key: string;
  state: HealthState;
  successRate: number;
  averageLatencyMs: number;
  errorRate: number;
  lastSuccess: number | null;
  lastFailure: number | null;
  degradedAt: number | null;
  quarantinedAt: number | null;
}

// ── Backpressure ─────────────────────────────────────────────────────────────

export interface ConcurrencyConfig {
  maxConcurrency: number;
  timeoutMs: number;
  rateLimitRps?: number;
  burstCapacity?: number;
}

export interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefill: number;
}

export interface SlotConfig {
  concurrency: number;
  acquired: number;
  queue: PriorityQueueEntry[];
}

export interface PriorityQueueEntry {
  priority: Priority;
  enqueuedAt: number;
  key: string;
  requestId: string;
}

export interface BackpressureConfig {
  globalMaxConcurrency: number;
  defaultPerProvider: number;
  defaultPerAccount: number;
  adaptiveLatencyThresholdMs: number;
  adaptiveReductionFactor: number;
  queueTimeoutMs: number;
}

// ── Stream Keepalive ──────────────────────────────────────────────────────────

export interface StreamKeepaliveConfig {
  idleTimeoutMs: number;
  heartbeatIntervalMs: number;
  maxStallTimeMs: number;
  enabled: boolean;
}

export interface StreamSession {
  id: string;
  provider: string;
  model: string;
  requestId: string;
  startedAt: number;
  lastChunkAt: number;
  heartbeatCount: number;
  stallCount: number;
  clientConnected: boolean;
  providerConnected: boolean;
}

// ── Multi-Account ─────────────────────────────────────────────────────────────

export interface AccountConfig {
  id: string;
  provider: string;
  apiKey?: string;
  quotaLimit?: number;
  quotaUsed?: number;
  rateLimitRps?: number;
  weight: number;
  regions?: string[];
}

export interface AccountHealth {
  accountId: string;
  provider: string;
  quotaRemaining: number;
  rateLimitAvailable: boolean;
  cooldownActive: boolean;
  cooldownExpiresAt: number | null;
  healthState: HealthState;
  averageLatencyMs: number;
  successRate: number;
  lastSuccess: number | null;
  lastFailure: number | null;
}

// ── Priority Queue ────────────────────────────────────────────────────────────

export interface QueuePolicy {
  maxConcurrency: number;
  timeoutMs: number;
  providerEligibility: string[];
  costPolicy?: 'any' | 'low' | 'medium' | 'high';
  fairnessWindowMs: number;
}

export interface QueuedRequest {
  id: string;
  priority: Priority;
  provider: string;
  model: string;
  request: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  };
  enqueuedAt: number;
  timeoutAt: number;
  tenantId?: string;
}

// ── Execution Engine ──────────────────────────────────────────────────────────

export interface ReliabilityConfig {
  circuitBreaker?: Partial<CircuitBreakerConfig>;
  cooldown?: Partial<CooldownConfig>;
  fallback?: Partial<FallbackConfig>;
  selfHealing?: Partial<HealthThresholds>;
  backpressure?: Partial<BackpressureConfig>;
  streamKeepalive?: Partial<StreamKeepaliveConfig>;
}

export interface ExecutionResult<T> {
  success: boolean;
  result?: T;
  error?: {
    code: string;
    message: string;
    status: number;
    provider: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
  attempts: number;
  fallbackUsed: boolean;
  provider: string;
  model: string;
  latencyMs: number;
  circuitBreakerState?: CircuitState;
  cooldownActive?: boolean;
}

// ── Provider Error (re-export from shared for convenience) ────────────────────

export type { ProviderError } from '@bifrost/shared';
