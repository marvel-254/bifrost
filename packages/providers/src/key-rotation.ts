/**
 * Multi-key rotation for provider API keys.
 * Supports round-robin and health-aware rotation.
 * Each provider can have multiple API keys for rate limit distribution.
 */

export interface RotatableKey {
  id: string;
  apiKey: string;
  label: string | null;
  priority: number;
  enabled: boolean;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number | null;
  lastUsedAt: string | null;
}

export type RotationStrategy = 'round-robin' | 'least-used' | 'lowest-latency' | 'priority';

export interface KeyRotatorConfig {
  strategy: RotationStrategy;
  maxConsecutiveErrors: number;
  cooldownMs: number;
}

const DEFAULT_CONFIG: KeyRotatorConfig = {
  strategy: 'priority',
  maxConsecutiveErrors: 5,
  cooldownMs: 60000,
};

export class KeyRotator {
  private keys: RotatableKey[] = [];
  private currentIndex = 0;
  private config: KeyRotatorConfig;
  private lastErrorTimes: Map<string, number> = new Map();

  constructor(config?: Partial<KeyRotatorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setKeys(keys: RotatableKey[]): void {
    this.keys = keys
      .filter(k => k.enabled)
      .sort((a, b) => {
        if (this.config.strategy === 'priority') return a.priority - b.priority;
        if (this.config.strategy === 'least-used') return a.successCount - b.successCount;
        if (this.config.strategy === 'lowest-latency') {
          const aLat = a.avgLatencyMs ?? Infinity;
          const bLat = b.avgLatencyMs ?? Infinity;
          return aLat - bLat;
        }
        return 0;
      });
  }

  getNextKey(): RotatableKey | null {
    const available = this.getAvailableKeys();
    if (available.length === 0) return null;

    if (this.config.strategy === 'round-robin') {
      const key = available[this.currentIndex % available.length];
      this.currentIndex = (this.currentIndex + 1) % available.length;
      return key;
    }

    return available[0];
  }

  private getAvailableKeys(): RotatableKey[] {
    const now = Date.now();
    return this.keys.filter(key => {
      const lastError = this.lastErrorTimes.get(key.id);
      if (lastError && (now - lastError) < this.config.cooldownMs) {
        return false;
      }
      if (key.errorCount >= this.config.maxConsecutiveErrors) {
        if (lastError && (now - lastError) < this.config.cooldownMs * 3) {
          return false;
        }
      }
      return true;
    });
  }

  recordSuccess(keyId: string, latencyMs: number): void {
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.successCount++;
      key.avgLatencyMs = key.avgLatencyMs === null ? latencyMs : (key.avgLatencyMs + latencyMs) / 2;
      key.lastUsedAt = new Date().toISOString();
    }
    this.lastErrorTimes.delete(keyId);
  }

  recordError(keyId: string): void {
    const key = this.keys.find(k => k.id === keyId);
    if (key) {
      key.errorCount++;
    }
    this.lastErrorTimes.set(keyId, Date.now());
  }

  getKeyStats(): Array<{
    id: string;
    label: string | null;
    success: number;
    errors: number;
    avgLatency: number | null;
    available: boolean;
  }> {
    return this.keys.map(k => ({
      id: k.id,
      label: k.label,
      success: k.successCount,
      errors: k.errorCount,
      avgLatency: k.avgLatencyMs,
      available: this.getAvailableKeys().some(avail => avail.id === k.id),
    }));
  }

  getAvailableCount(): number {
    return this.getAvailableKeys().length;
  }

  getTotalCount(): number {
    return this.keys.length;
  }
}
