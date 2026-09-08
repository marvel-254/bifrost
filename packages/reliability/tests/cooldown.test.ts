import { ProviderCooldown } from '../src/cooldown';

describe('ProviderCooldown', () => {
  let cooldown: ProviderCooldown;

  beforeEach(() => {
    cooldown = new ProviderCooldown({
      escalation429: [100, 200, 500],
      escalation5xx: [50, 200],
      escalationTimeout: [100, 300],
      escalationAuth: -1,
    });
  });

  afterEach(() => {
    cooldown.destroy();
  });

  test('not in cooldown initially', () => {
    expect(cooldown.isInCooldown('provider:openai')).toBe(false);
    expect(cooldown.getRemainingCooldown('provider:openai')).toBe(0);
  });

  test('enters cooldown and expires', async () => {
    cooldown.enterCooldown('provider:openai', 'rate_limit');
    expect(cooldown.isInCooldown('provider:openai')).toBe(true);
    expect(cooldown.getRemainingCooldown('provider:openai')).toBeGreaterThan(0);

    await new Promise(r => setTimeout(r, 150));
    expect(cooldown.isInCooldown('provider:openai')).toBe(false);
    expect(cooldown.getRemainingCooldown('provider:openai')).toBe(0);
  });

  test('escalates 429 cooldowns', async () => {
    cooldown.enterCooldown('provider:openai', 'rate_limit');
    const firstRemaining = cooldown.getRemainingCooldown('provider:openai');
    expect(firstRemaining).toBeGreaterThan(80);
    expect(firstRemaining).toBeLessThanOrEqual(120);

    await new Promise(r => setTimeout(r, 150));
    cooldown.enterCooldown('provider:openai', 'rate_limit');
    const secondRemaining = cooldown.getRemainingCooldown('provider:openai');
    expect(secondRemaining).toBeGreaterThan(180);
    expect(secondRemaining).toBeLessThanOrEqual(220);
  });

  test('auth failure disables provider indefinitely', () => {
    cooldown.enterCooldown('provider:openai', 'auth_failure');
    expect(cooldown.isInCooldown('provider:openai')).toBe(true);
    expect(cooldown.getRemainingCooldown('provider:openai')).toBe(Infinity);
  });

  test('removes cooldown', async () => {
    cooldown.enterCooldown('provider:openai', 'server_error');
    expect(cooldown.isInCooldown('provider:openai')).toBe(true);
    cooldown.removeCooldown('provider:openai');
    expect(cooldown.isInCooldown('provider:openai')).toBe(false);
  });

  test('tracks cooldown entry details', async () => {
    cooldown.enterCooldown('provider:openai', 'timeout');
    const entry = cooldown.getEntry('provider:openai');
    expect(entry).toBeDefined();
    expect(entry!.reason).toBe('timeout');
    expect(entry!.level).toBe(0);
  });
});
