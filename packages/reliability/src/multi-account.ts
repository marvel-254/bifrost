import type { AccountConfig, AccountHealth } from './types';

export class MultiAccountRotation {
  private accounts: Map<string, AccountConfig[]> = new Map();
  private health: Map<string, AccountHealth> = new Map();

  registerAccounts(provider: string, accounts: AccountConfig[]): void {
    this.accounts.set(provider, accounts);
  }

  updateAccountHealth(provider: string, accountId: string, health: Partial<AccountHealth>): void {
    const key = `${provider}:${accountId}`;
    const existing = this.health.get(key);
    const updated: AccountHealth = {
      accountId,
      provider,
      quotaRemaining: existing?.quotaRemaining ?? 100,
      rateLimitAvailable: existing?.rateLimitAvailable ?? true,
      cooldownActive: existing?.cooldownActive ?? false,
      cooldownExpiresAt: existing?.cooldownExpiresAt ?? null,
      healthState: existing?.healthState ?? 'healthy',
      averageLatencyMs: existing?.averageLatencyMs ?? 0,
      successRate: existing?.successRate ?? 1.0,
      lastSuccess: existing?.lastSuccess ?? null,
      lastFailure: existing?.lastFailure ?? null,
      ...health,
    };
    this.health.set(key, updated);
  }

  selectAccount(provider: string, candidates: AccountConfig[]): AccountConfig {
    const providerAccounts = this.accounts.get(provider) ?? candidates;
    if (providerAccounts.length === 0) {
      throw new Error(`No accounts registered for provider ${provider}`);
    }
    if (providerAccounts.length === 1) {
      return providerAccounts[0];
    }

    const scored = providerAccounts.map(account => {
      const key = `${provider}:${account.id}`;
      const h = this.health.get(key);
      const quotaScore = h ? h.quotaRemaining : 100;
      const rateLimitScore = h?.rateLimitAvailable ? 1 : 0;
      const cooldownScore = h?.cooldownActive ? 0 : 1;
      const healthScore = h ? (h.healthState === 'healthy' ? 1 : h.healthState === 'degraded' ? 0.5 : 0) : 0.5;
      const latencyScore = h ? Math.max(0, 1 - h.averageLatencyMs / 10000) : 0.5;
      const successScore = h?.successRate ?? 0.5;

      const weight = account.weight || 1;
      const score =
        quotaScore * 0.25 +
        rateLimitScore * 0.20 +
        cooldownScore * 0.20 +
        healthScore * 0.15 +
        latencyScore * 0.10 +
        successScore * 0.10;

      return { account, score: score * weight };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].account;
  }

  getAccountHealth(provider: string, accountId: string): AccountHealth | undefined {
    return this.health.get(`${provider}:${accountId}`);
  }

  getAllAccounts(provider: string): AccountConfig[] {
    return this.accounts.get(provider) ?? [];
  }
}
