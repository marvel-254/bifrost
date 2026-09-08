import type { Priority, QueuePolicy, QueuedRequest } from './types';

const DEFAULT_POLICIES: Record<Priority, QueuePolicy> = {
  critical: {
    maxConcurrency: 10,
    timeoutMs: 5000,
    providerEligibility: [],
    costPolicy: 'any',
    fairnessWindowMs: 0,
  },
  high: {
    maxConcurrency: 8,
    timeoutMs: 10000,
    providerEligibility: [],
    costPolicy: 'any',
    fairnessWindowMs: 0,
  },
  normal: {
    maxConcurrency: 5,
    timeoutMs: 30000,
    providerEligibility: [],
    costPolicy: 'any',
    fairnessWindowMs: 60000,
  },
  low: {
    maxConcurrency: 3,
    timeoutMs: 60000,
    providerEligibility: [],
    costPolicy: 'low',
    fairnessWindowMs: 120000,
  },
  background: {
    maxConcurrency: 2,
    timeoutMs: 120000,
    providerEligibility: [],
    costPolicy: 'any',
    fairnessWindowMs: 300000,
  },
};

const PRIORITY_ORDER: Priority[] = ['critical', 'high', 'normal', 'low', 'background'];

export class PriorityQueue {
  private queues: Map<Priority, QueuedRequest[]> = new Map();
  private policies: Map<Priority, QueuePolicy> = new Map();
  private processing: Map<Priority, number> = new Map();
  private fairnessTrackers: Map<string, number> = new Map();
  private timeoutIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(policies: Partial<Record<Priority, Partial<QueuePolicy>>> = {}) {
    for (const priority of PRIORITY_ORDER) {
      this.queues.set(priority, []);
      this.processing.set(priority, 0);
      this.policies.set(priority, { ...DEFAULT_POLICIES[priority], ...policies[priority] });
    }
  }

  private getPolicy(priority: Priority): QueuePolicy {
    return this.policies.get(priority) ?? DEFAULT_POLICIES[priority];
  }

  async enqueue(request: QueuedRequest): Promise<void> {
    const policy = this.getPolicy(request.priority);
    const queue = this.queues.get(request.priority) ?? [];

    if (policy.providerEligibility.length > 0 && !policy.providerEligibility.includes(request.provider)) {
      throw new Error(`Provider ${request.provider} not eligible for priority ${request.priority}`);
    }

    queue.push(request);
    this.queues.set(request.priority, queue);

    const timeout = setTimeout(() => {
      const idx = queue.findIndex(r => r.id === request.id);
      if (idx >= 0) {
        queue.splice(idx, 1);
        this.queues.set(request.priority, queue);
      }
    }, policy.timeoutMs);

    this.timeoutIntervals.set(request.id, timeout);
  }

  dequeue(provider: string): QueuedRequest | null {
    for (const priority of PRIORITY_ORDER) {
      const policy = this.getPolicy(priority);
      const queue = this.queues.get(priority) ?? [];
      const processing = this.processing.get(priority) ?? 0;

      if (queue.length === 0) continue;
      if (processing >= policy.maxConcurrency) continue;
      if (policy.providerEligibility.length > 0 && !policy.providerEligibility.includes(provider)) continue;

      const request = queue.shift()!;
      this.queues.set(priority, queue);
      this.processing.set(priority, processing + 1);

      const timeout = this.timeoutIntervals.get(request.id);
      if (timeout) clearTimeout(timeout);
      this.timeoutIntervals.delete(request.id);

      return request;
    }

    return null;
  }

  complete(priority: Priority): void {
    const processing = this.processing.get(priority) ?? 0;
    this.processing.set(priority, Math.max(0, processing - 1));
  }

  getQueueDepth(priority: Priority): number {
    return this.queues.get(priority)?.length ?? 0;
  }

  getTotalDepth(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  getProcessingCount(priority: Priority): number {
    return this.processing.get(priority) ?? 0;
  }

  drain(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
    for (const [id, timer] of this.timeoutIntervals) {
      clearTimeout(timer);
      this.timeoutIntervals.delete(id);
    }
  }
}
