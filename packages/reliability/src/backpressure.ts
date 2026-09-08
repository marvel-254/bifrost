import type { BackpressureConfig, Priority, SlotConfig, TokenBucket } from './types';

const DEFAULT_CONFIG: BackpressureConfig = {
  globalMaxConcurrency: 100,
  defaultPerProvider: 20,
  defaultPerAccount: 10,
  adaptiveLatencyThresholdMs: 5000,
  adaptiveReductionFactor: 0.5,
  queueTimeoutMs: 30000,
};

export type ReleaseFn = () => void;

interface QueuedRequest {
  priority: Priority;
  resolve: (release: ReleaseFn) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
  timeout: ReturnType<typeof setTimeout>;
}

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'normal', 'low', 'background'];

export class BackpressureEngine {
  private config: BackpressureConfig;
  private slots: Map<string, SlotConfig> = new Map();
  private queues: Map<string, QueuedRequest[]> = new Map();
  private buckets: Map<string, TokenBucket> = new Map();
  private latencyHistory: Map<string, number[]> = new Map();

  constructor(config: Partial<BackpressureConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getSlot(key: string): SlotConfig {
    let slot = this.slots.get(key);
    if (!slot) {
      slot = {
        concurrency: this.config.defaultPerProvider,
        acquired: 0,
        queue: [],
      };
      this.slots.set(key, slot);
    }
    return slot;
  }

  private getBucket(key: string, rps: number, burst: number): TokenBucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = {
        tokens: burst,
        capacity: burst,
        refillRate: rps,
        lastRefill: Date.now(),
      };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refillBucket(bucket: TokenBucket): void {
    const now = Date.now();
    const elapsed = (now - bucket.lastRefill) / 1000;
    const tokensToAdd = elapsed * bucket.refillRate;
    bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  private consumeToken(bucket: TokenBucket): boolean {
    this.refillBucket(bucket);
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }
    return false;
  }

  private recordLatency(key: string, latencyMs: number): void {
    const history = this.latencyHistory.get(key) ?? [];
    history.push(latencyMs);
    if (history.length > 20) history.shift();
    this.latencyHistory.set(key, history);
  }

  private getAdaptiveConcurrency(key: string): number {
    const history = this.latencyHistory.get(key) ?? [];
    if (history.length < 5) return this.getSlot(key).concurrency;

    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    if (avg > this.config.adaptiveLatencyThresholdMs) {
      return Math.max(1, Math.floor(this.getSlot(key).concurrency * this.config.adaptiveReductionFactor));
    }
    return this.getSlot(key).concurrency;
  }

  async acquireSlot(key: string, priority: Priority): Promise<ReleaseFn> {
    return new Promise((resolve, reject) => {
      const slot = this.getSlot(key);
      const adaptiveLimit = this.getAdaptiveConcurrency(key);

      if (slot.acquired < adaptiveLimit) {
        slot.acquired++;
        const release: ReleaseFn = () => {
          slot.acquired = Math.max(0, slot.acquired - 1);
          this.processQueue(key);
        };
        resolve(release);
        return;
      }

      const queue = this.queues.get(key) ?? [];
      const timeout = setTimeout(() => {
        const idx = queue.findIndex(r => r.resolve === resolve);
        if (idx >= 0) queue.splice(idx, 1);
        reject(new Error(`Backpressure queue timeout for ${key}`));
      }, this.config.queueTimeoutMs);

      queue.push({
        priority,
        resolve: (release: ReleaseFn) => {
          clearTimeout(timeout);
          resolve(release);
        },
        reject: (error: Error) => {
          clearTimeout(timeout);
          reject(error);
        },
        enqueuedAt: Date.now(),
        timeout,
      });
      queue.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
      this.queues.set(key, queue);
    });
  }

  private processQueue(key: string): void {
    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) return;

    const slot = this.getSlot(key);
    const adaptiveLimit = this.getAdaptiveConcurrency(key);

    while (queue.length > 0 && slot.acquired < adaptiveLimit) {
      const request = queue.shift()!;
      slot.acquired++;
      request.resolve(() => {
        slot.acquired = Math.max(0, slot.acquired - 1);
        this.processQueue(key);
      });
    }

    if (queue.length === 0) {
      this.queues.delete(key);
    }
  }

  recordCompletion(key: string, latencyMs: number): void {
    this.recordLatency(key, latencyMs);
  }

  configureRateLimit(key: string, rps: number, burst: number = rps): void {
    this.buckets.set(key, {
      tokens: burst,
      capacity: burst,
      refillRate: rps,
      lastRefill: Date.now(),
    });
  }

  tryAcquireRateLimit(key: string): boolean {
    const bucket = this.buckets.get(key);
    if (!bucket) return true;
    return this.consumeToken(bucket);
  }

  getQueueDepth(key: string): number {
    return this.queues.get(key)?.length ?? 0;
  }

  getSlotConfig(key: string): SlotConfig {
    return this.getSlot(key);
  }

  setConcurrency(key: string, concurrency: number): void {
    const slot = this.getSlot(key);
    slot.concurrency = concurrency;
    this.processQueue(key);
  }
}
