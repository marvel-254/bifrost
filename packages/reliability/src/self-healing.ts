import type { HealthRecord, HealthState, HealthThresholds } from './types';

const DEFAULT_THRESHOLDS: HealthThresholds = {
  successRateDrop: 0.15,
  latencySpikeMultiplier: 2.0,
  errorRateIncrease: 0.10,
  degradedSuccessRate: 0.85,
  unhealthySuccessRate: 0.50,
  recoverySuccessRate: 0.90,
  probeLatencyMs: 5000,
};

export class SelfHealing {
  private records: Map<string, HealthRecord> = new Map();
  private thresholds: HealthThresholds;
  private monitorInterval: ReturnType<typeof setInterval> | null = null;

  constructor(thresholds: Partial<HealthThresholds> = {}) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  startMonitoring(intervalMs: number, probeFn: (key: string) => Promise<boolean>): void {
    this.stopMonitoring();
    this.monitorInterval = setInterval(async () => {
      await this.monitorHealth(probeFn);
    }, intervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async monitorHealth(probeFn: (key: string) => Promise<boolean>): Promise<void> {
    for (const [key, record] of this.records) {
      if (record.state === 'disabled') {
        const recovered = await this.testRecovery(key, probeFn);
        if (recovered) {
          this.restoreProvider(key);
        }
      }
    }
  }

  recordSuccess(key: string, latencyMs: number): void {
    const record = this.getOrCreateRecord(key);
    record.lastSuccess = Date.now();
    record.successRate = 1.0;
    record.errorRate = 0;
    this.updateHealthState(record);
  }

  recordFailure(key: string, latencyMs: number): void {
    const record = this.getOrCreateRecord(key);
    record.lastFailure = Date.now();
    record.successRate = 0;
    record.errorRate = 1.0;
    this.updateHealthState(record);
  }

  private getOrCreateRecord(key: string): HealthRecord {
    let record = this.records.get(key);
    if (!record) {
      record = {
        key,
        state: 'healthy',
        successRate: 1.0,
        averageLatencyMs: 0,
        errorRate: 0,
        lastSuccess: null,
        lastFailure: null,
        degradedAt: null,
        quarantinedAt: null,
      };
      this.records.set(key, record);
    }
    return record;
  }

  private updateHealthState(record: HealthRecord): void {
    if (record.state === 'disabled') return;

    if (record.successRate < this.thresholds.unhealthySuccessRate) {
      this.quarantineProvider(record.key, 'success_rate_critical');
      return;
    }

    if (record.successRate < this.thresholds.degradedSuccessRate || record.errorRate > this.thresholds.errorRateIncrease) {
      if (record.state !== 'degraded') {
        record.state = 'degraded';
        record.degradedAt = Date.now();
      }
    } else {
      record.state = 'healthy';
      record.degradedAt = null;
    }
  }

  quarantineProvider(key: string, reason: string): void {
    const record = this.getOrCreateRecord(key);
    record.state = 'disabled';
    record.quarantinedAt = Date.now();
  }

  async testRecovery(key: string, probeFn: (key: string) => Promise<boolean>): Promise<boolean> {
    const record = this.records.get(key);
    if (!record || record.state !== 'disabled') return false;

    try {
      const healthy = await probeFn(key);
      if (healthy) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  restoreProvider(key: string): void {
    const record = this.records.get(key);
    if (!record) return;
    record.state = 'healthy';
    record.successRate = 1.0;
    record.errorRate = 0;
    record.degradedAt = null;
    record.quarantinedAt = null;
  }

  getRecord(key: string): HealthRecord | undefined {
    return this.records.get(key);
  }

  getAllRecords(): Map<string, HealthRecord> {
    return new Map(this.records);
  }

  isHealthy(key: string): boolean {
    const record = this.records.get(key);
    if (!record) return true;
    return record.state === 'healthy';
  }

  isQuarantined(key: string): boolean {
    const record = this.records.get(key);
    if (!record) return false;
    return record.state === 'disabled';
  }
}
