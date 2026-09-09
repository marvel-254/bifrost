import { TenantManager, tenantManager } from '../src/tenancy';

describe('TenantManager', () => {
  const manager = new TenantManager();

  beforeEach(() => {
    manager.deleteTenant('tenant-a');
    manager.deleteTenant('tenant-b');
  });

  test('creates default config for new tenant', () => {
    const config = manager.getTenantConfig('tenant-a');
    expect(config.tenant_id).toBe('tenant-a');
    expect(config.enabled).toBe(true);
    expect(config.cache_config.tenant_isolated).toBe(true);
    expect(config.data_residency.allowed_regions).toContain('us');
  });

  test('updates tenant config partially', () => {
    const updated = manager.updateTenantConfig('tenant-a', {
      name: 'Tenant A',
      cost_limits: { daily_max: 500, monthly_max: 5000, per_request_max: 50, alert_threshold: 0.9 },
    });
    expect(updated.name).toBe('Tenant A');
    expect(updated.cost_limits.daily_max).toBe(500);
    expect(updated.cost_limits.monthly_max).toBe(5000);
    expect(updated.routing_preferences.strategy).toBe('balanced');
  });

  test('no cross-tenant data leakage', () => {
    manager.updateTenantConfig('tenant-a', { name: 'A', cost_limits: { daily_max: 100, monthly_max: 1000, per_request_max: 10, alert_threshold: 0.8 } });
    manager.updateTenantConfig('tenant-b', { name: 'B', cost_limits: { daily_max: 999, monthly_max: 9999, per_request_max: 99, alert_threshold: 0.99 } });

    const a = manager.getTenantConfig('tenant-a');
    const b = manager.getTenantConfig('tenant-b');

    expect(a.cost_limits.daily_max).toBe(100);
    expect(b.cost_limits.daily_max).toBe(999);
    expect(a.name).toBe('A');
    expect(b.name).toBe('B');
  });

  test('provider access isolation', () => {
    manager.updateTenantConfig('tenant-a', {
      provider_access: { allowed: ['openai'], blocked: ['anthropic'], multi_account: {} },
    });
    manager.updateTenantConfig('tenant-b', {
      provider_access: { allowed: ['anthropic'], blocked: ['openai'], multi_account: {} },
    });

    expect(manager.getEffectiveProviderAccess('tenant-a').allowed).toEqual(['openai']);
    expect(manager.getEffectiveProviderAccess('tenant-b').allowed).toEqual(['anthropic']);
  });

  test('model overrides isolation', () => {
    manager.setModelOverrides('tenant-a', { 'gpt-4': ['gpt-4-turbo'] });
    manager.setModelOverrides('tenant-b', { 'gpt-4': ['gpt-4o'] });

    expect(manager.getModelOverrides('tenant-a')).toEqual({ 'gpt-4': ['gpt-4-turbo'] });
    expect(manager.getModelOverrides('tenant-b')).toEqual({ 'gpt-4': ['gpt-4o'] });
  });

  test('isolated cache keys', () => {
    const keyA = manager.getIsolatedCacheKey('tenant-a', 'request-1');
    const keyB = manager.getIsolatedCacheKey('tenant-b', 'request-1');
    expect(keyA).toBe('tenant:tenant-a:request-1');
    expect(keyB).toBe('tenant:tenant-b:request-1');
    expect(keyA).not.toBe(keyB);
  });

  test('isolated telemetry namespace', () => {
    const nsA = manager.getIsolatedTelemetryNamespace('tenant-a');
    const nsB = manager.getIsolatedTelemetryNamespace('tenant-b');
    expect(nsA).toBe('tenant_tenant-a');
    expect(nsB).toBe('tenant_tenant-b');
  });

  test('getAllTenants returns all configs', () => {
    manager.updateTenantConfig('tenant-a', { name: 'A' });
    manager.updateTenantConfig('tenant-b', { name: 'B' });
    const all = manager.getAllTenants();
    expect(all.length).toBe(2);
  });
});
