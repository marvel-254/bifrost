import type {
  CircuitBreakerConfig,
  CircuitBreakerEntry,
  CircuitBreakerMetrics,
  CircuitState,
} from './types';

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  timeoutThreshold: 30000,
  recoveryTimeout: 30000,
  probeFrequency: 5000,
  threshold429: 5,
  threshold5xx: 3,
  thresholdTimeout: 3,
  thresholdConnection: 3,
};

export class CircuitBreaker {
  private entries: Map<string, CircuitBreakerEntry> = new Map();
  private defaultConfig: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
  }

  private getEntry(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreakerEntry {
    const cfg = { ...this.defaultConfig, ...config };
    let entry = this.entries.get(key);
    if (!entry) {
      entry = {
        config: cfg,
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailure: null,
        lastSuccess: null,
        openedAt: null,
        lastProbeAt: null,
      };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private reset(entry: CircuitBreakerEntry): void {
    entry.state = 'CLOSED';
    entry.failureCount = 0;
    entry.successCount = 0;
    entry.lastFailure = null;
    entry.lastSuccess = null;
    entry.openedAt = null;
    entry.lastProbeAt = null;
  }

  private open(entry: CircuitBreakerEntry): void {
    entry.state = 'OPEN';
    entry.openedAt = Date.now();
  }

  private halfOpen(entry: CircuitBreakerEntry): void {
    entry.state = 'HALF_OPEN';
    entry.lastProbeAt = Date.now();
  }

  private getThresholdForError(category: string, entry: CircuitBreakerEntry): number {
    switch (category) {
      case 'rate_limit_429':
        return entry.config.threshold429;
      case 'server_error_5xx':
        return entry.config.threshold5xx;
      case 'timeout':
        return entry.config.thresholdTimeout;
      case 'connection_failure':
        return entry.config.thresholdConnection;
      default:
        return entry.config.failureThreshold;
    }
  }

  private categorizeError(error: unknown): string {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('429') || msg.includes('rate limit')) return 'rate_limit_429';
      if (msg.includes('5') && msg.includes('server error')) return 'server_error_5xx';
      if (msg.includes('timeout') || msg.includes('timed out')) return 'timeout';
      if (msg.includes('econnreset') || msg.includes('enotfound') || msg.includes('econnrefused') || msg.includes('connection')) return 'connection_failure';
      if (msg.includes('auth') || msg.includes('401') || msg.includes('403')) return 'auth_failure';
    }
    if (typeof error === 'object' && error !== null && 'status' in error) {
      const status = (error as { status: number }).status;
      if (status === 429) return 'rate_limit_429';
      if (status >= 500) return 'server_error_5xx';
      if (status === 408 || status === 504) return 'timeout';
    }
    return 'unknown';
  }

  async execute<T>(key: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T> {
    const entry = this.getEntry(key, config);

    if (entry.state === 'OPEN') {
      const elapsed = Date.now() - (entry.openedAt ?? 0);
      if (elapsed >= entry.config.recoveryTimeout) {
        this.halfOpen(entry);
      } else {
        throw new Error(`Circuit breaker OPEN for ${key}. Retry after ${Math.ceil((entry.config.recoveryTimeout - elapsed) / 1000)}s`);
      }
    }

    if (entry.state === 'HALF_OPEN') {
      const elapsed = Date.now() - (entry.lastProbeAt ?? 0);
      if (elapsed < entry.config.probeFrequency) {
        throw new Error(`Circuit breaker HALF_OPEN for ${key}. Probe frequency not met.`);
      }
    }

    try {
      const result = await fn();
      entry.successCount++;
      entry.lastSuccess = Date.now();
      if (entry.state === 'HALF_OPEN') {
        this.reset(entry);
      }
      return result;
    } catch (error) {
      const category = this.categorizeError(error);
      const threshold = this.getThresholdForError(category, entry);
      entry.failureCount++;
      entry.lastFailure = Date.now();

      if (entry.failureCount >= threshold) {
        this.open(entry);
      }

      throw error;
    }
  }

  getMetrics(key: string): CircuitBreakerMetrics {
    const entry = this.entries.get(key);
    if (!entry) {
      return {
        state: 'CLOSED',
        failureCount: 0,
        successCount: 0,
        lastFailure: null,
        lastSuccess: null,
      };
    }
    return {
      state: entry.state,
      failureCount: entry.failureCount,
      successCount: entry.successCount,
      lastFailure: entry.lastFailure,
      lastSuccess: entry.lastSuccess,
    };
  }

  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const result = new Map<string, CircuitBreakerMetrics>();
    for (const [key, entry] of this.entries) {
      result.set(key, {
        state: entry.state,
        failureCount: entry.failureCount,
        successCount: entry.successCount,
        lastFailure: entry.lastFailure,
        lastSuccess: entry.lastSuccess,
      });
    }
    return result;
  }

  forceClose(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.reset(entry);
  }

  forceOpen(key: string): void {
    const entry = this.entries.get(key);
    if (entry) this.open(entry);
  }

  resetAll(): void {
    this.entries.clear();
  }
}
