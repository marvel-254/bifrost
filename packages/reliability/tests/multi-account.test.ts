import { MultiAccountRotation } from '../src/multi-account';
import type { AccountConfig } from '../src/types';

describe('MultiAccountRotation', () => {
  let rotation: MultiAccountRotation;

  beforeEach(() => {
    rotation = new MultiAccountRotation();
  });

  test('selects only account when single', () => {
    rotation.registerAccounts('openai', [{ id: 'acc1', provider: 'openai', weight: 1 }]);
    const selected = rotation.selectAccount('openai', [{ id: 'acc1', provider: 'openai', weight: 1 }]);
    expect(selected.id).toBe('acc1');
  });

  test('selects based on health and quota', () => {
    rotation.registerAccounts('openai', [
      { id: 'acc1', provider: 'openai', quotaLimit: 100, quotaUsed: 90, weight: 1 },
      { id: 'acc2', provider: 'openai', quotaLimit: 100, quotaUsed: 10, weight: 1 },
    ]);
    rotation.updateAccountHealth('openai', 'acc1', { quotaRemaining: 10, successRate: 0.5 });
    rotation.updateAccountHealth('openai', 'acc2', { quotaRemaining: 90, successRate: 0.95 });

    const selected = rotation.selectAccount('openai', []);
    expect(selected.id).toBe('acc2');
  });

  test('prefers non-cooldown account', () => {
    rotation.registerAccounts('openai', [
      { id: 'acc1', provider: 'openai', weight: 1 },
      { id: 'acc2', provider: 'openai', weight: 1 },
    ]);
    rotation.updateAccountHealth('openai', 'acc1', { cooldownActive: true });
    rotation.updateAccountHealth('openai', 'acc2', { cooldownActive: false });

    const selected = rotation.selectAccount('openai', []);
    expect(selected.id).toBe('acc2');
  });

  test('returns health record', () => {
    rotation.registerAccounts('openai', [{ id: 'acc1', provider: 'openai', weight: 1 }]);
    rotation.updateAccountHealth('openai', 'acc1', { successRate: 0.9 });
    const health = rotation.getAccountHealth('openai', 'acc1');
    expect(health?.successRate).toBe(0.9);
  });

  test('returns all accounts for provider', () => {
    rotation.registerAccounts('openai', [
      { id: 'acc1', provider: 'openai', weight: 1 },
      { id: 'acc2', provider: 'openai', weight: 1 },
    ]);
    const accounts = rotation.getAllAccounts('openai');
    expect(accounts).toHaveLength(2);
  });
});
