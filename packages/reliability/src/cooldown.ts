import type { CooldownConfig, CooldownEntry, CooldownReason } from './types';

const DEFAULT_CONFIG: CooldownConfig = {
  defaultDurationMs: 30000,
  escalation429: [30000, 120000, 300000],
  escalation5xx: [15000, 300000],
  escalationTimeout: [30000, 120000],
  escalationAuth: -1,
};

export class ProviderCooldown {
  private entries: Map<string, CooldownEntry> = new Map();
  private defaultConfig: CooldownConfig;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<CooldownConfig> = {}) {
    this.defaultConfig = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.entries) {
        if (entry.expiresAt <= now && !entry.disableProvider) {
          this.entries.delete(key);
        }
      }
    }, 10000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.entries.clear();
  }

  private getNextLevel(key: string, reason: CooldownReason): number {
    const current = this.entries.get(key);
    const currentLevel = current?.level ?? -1;

    let escalation: number[];
    switch (reason) {
      case 'rate_limit':
        escalation = this.defaultConfig.escalation429;
        break;
      case 'server_error':
        escalation = this.defaultConfig.escalation5xx;
        break;
      case 'timeout':
        escalation = this.defaultConfig.escalationTimeout;
        break;
      case 'auth_failure':
        return this.defaultConfig.escalationAuth;
      default:
        return this.defaultConfig.defaultDurationMs;
    }

    const nextLevel = currentLevel + 1;
    if (nextLevel < escalation.length) {
      return escalation[nextLevel];
    }
    return escalation[escalation.length - 1];
  }

  enterCooldown(key: string, reason: CooldownReason): void {
    const duration = this.getNextLevel(key, reason);
    const disableProvider = reason === 'auth_failure';
    const entry: CooldownEntry = {
      reason,
      expiresAt: disableProvider ? Date.now() + 365 * 24 * 60 * 60 * 1000 : Date.now() + duration,
      level: this.entries.has(key) ? (this.entries.get(key)!.level + 1) : 0,
      disableProvider,
    };
    this.entries.set(key, entry);
  }

  isInCooldown(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (entry.disableProvider) return true;
    return entry.expiresAt > Date.now();
  }

  getRemainingCooldown(key: string): number {
    const entry = this.entries.get(key);
    if (!entry) return 0;
    if (entry.disableProvider) return Infinity;
    const remaining = entry.expiresAt - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  getEntry(key: string): CooldownEntry | undefined {
    return this.entries.get(key);
  }

  removeCooldown(key: string): void {
    this.entries.delete(key);
  }

  getAllCooldowns(): Map<string, CooldownEntry> {
    return new Map(this.entries);
  }
}
