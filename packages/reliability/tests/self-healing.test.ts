import { SelfHealing } from '../src/self-healing';

describe('SelfHealing', () => {
  let healing: SelfHealing;

  beforeEach(() => {
    healing = new SelfHealing({
      degradedSuccessRate: 0.8,
      unhealthySuccessRate: 0.5,
      recoverySuccessRate: 0.9,
    });
  });

  afterEach(() => {
    healing.stopMonitoring();
  });

  test('starts as healthy', () => {
    expect(healing.isHealthy('p1')).toBe(true);
    expect(healing.isQuarantined('p1')).toBe(false);
  });

  test('quarantines on critical failure rate', () => {
    healing.recordFailure('p1', 1000);
    healing.recordFailure('p1', 1000);
    healing.recordFailure('p1', 1000);
    healing.recordFailure('p1', 1000);
    healing.recordFailure('p1', 1000);
    expect(healing.isQuarantined('p1')).toBe(true);
  });

  test('testRecovery returns false for non-quarantined', async () => {
    const result = await healing.testRecovery('p1', async () => true);
    expect(result).toBe(false);
  });

  test('restore resets state', () => {
    healing.quarantineProvider('p1', 'test');
    expect(healing.isQuarantined('p1')).toBe(true);
    healing.restoreProvider('p1');
    expect(healing.isHealthy('p1')).toBe(true);
    expect(healing.isQuarantined('p1')).toBe(false);
  });

  test('records success and updates state', () => {
    healing.recordSuccess('p1', 100);
    expect(healing.getRecord('p1')?.lastSuccess).toBeDefined();
  });

  test('records failure and updates state', () => {
    healing.recordFailure('p1', 2000);
    const record = healing.getRecord('p1');
    expect(record?.lastFailure).toBeDefined();
  });

  test('monitorHealth probes quarantined providers', async () => {
    healing.quarantineProvider('p1', 'test');
    let probed = false;
    await healing.monitorHealth(async (key) => {
      probed = true;
      return true;
    });
    expect(probed).toBe(true);
    expect(healing.isHealthy('p1')).toBe(true);
  });
});
