import { PolicyRegistry } from '../src/policy-registry';
import type { Policy } from '../src/types';
import type { NormalizedRequest } from '@bifrost/shared';

function makePolicy(overrides: Partial<Policy> = {}): Policy {
  return {
    name: 'test-policy',
    priority: 0,
    version: 'v1',
    enabled: true,
    match: {
      tags: [],
      tenant: undefined,
      application: undefined,
      conditions: { AND: [], OR: [] },
    },
    constraints: {},
    require: { tools: false, structured_output: false, capabilities: [] },
    prefer: { quality: 'medium', cost: 'medium', latency: 'medium' },
    fallback: { strategy: 'auto' },
    optimization: { compression: 'auto', cache: true },
    ...overrides,
  };
}

function makeRequest(overrides: Partial<NormalizedRequest> = {}): NormalizedRequest {
  return {
    model: 'gpt-4',
    messages: [],
    ...overrides,
  };
}

describe('PolicyRegistry', () => {
  test('register and get policy', () => {
    const registry = new PolicyRegistry();
    const policy = makePolicy({ name: 'alpha', version: 'v1' });
    registry.registerPolicy(policy);
    expect(registry.getPolicy('alpha', 'v1')).toEqual(policy);
    expect(registry.getPolicy('alpha')).toEqual(policy);
  });

  test('listPolicies returns only latest versions', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'p1', version: 'v1', priority: 1 }));
    registry.registerPolicy(makePolicy({ name: 'p1', version: 'v2', priority: 2 }));
    registry.registerPolicy(makePolicy({ name: 'p2', version: 'v1', priority: 3 }));
    const listed = registry.listPolicies();
    expect(listed.length).toBe(2);
    expect(listed.map((p) => p.name).sort()).toEqual(['p1', 'p2']);
  });

  test('resolvePolicy matches by tags', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'tagged', priority: 10, match: { tags: ['vip'], conditions: { AND: [], OR: [] } } }));
    const req = makeRequest({ metadata: { tags: ['vip'] } });
    const result = registry.resolvePolicy(req, { request: req });
    expect(result?.name).toBe('tagged');
  });

  test('resolvePolicy matches by tenant', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'tenant-policy', priority: 10, match: { tenant: 'tenant-1', conditions: { AND: [], OR: [] } } }));
    const req = makeRequest();
    const result = registry.resolvePolicy(req, { tenantId: 'tenant-1', request: req });
    expect(result?.name).toBe('tenant-policy');
  });

  test('resolvePolicy does not match wrong tenant', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'tenant-policy', priority: 10, match: { tenant: 'tenant-1', conditions: { AND: [], OR: [] } } }));
    const req = makeRequest();
    const result = registry.resolvePolicy(req, { tenantId: 'tenant-2', request: req });
    expect(result).toBeNull();
  });

  test('resolvePolicy matches conditions', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(
      makePolicy({
        name: 'cond-policy',
        priority: 10,
        match: {
          conditions: {
            AND: [{ field: 'model', operator: 'eq', value: 'gpt-4' }],
            OR: [],
          },
        },
      })
    );
    const req = makeRequest({ model: 'gpt-4' });
    const result = registry.resolvePolicy(req, { request: req });
    expect(result?.name).toBe('cond-policy');
  });

  test('highest priority policy wins', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'low', priority: 1, match: { tags: ['vip'], conditions: { AND: [], OR: [] } } }));
    registry.registerPolicy(makePolicy({ name: 'high', priority: 100, match: { tags: ['vip'], conditions: { AND: [], OR: [] } } }));
    const req = makeRequest({ metadata: { tags: ['vip'] } });
    const result = registry.resolvePolicy(req, { request: req });
    expect(result?.name).toBe('high');
  });

  test('policy inheritance extends', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(
      makePolicy({
        name: 'base',
        version: 'v1',
        constraints: { max_cost: 5 },
        prefer: { quality: 'low', cost: 'low', latency: 'low' },
      })
    );
    registry.registerPolicy(
      makePolicy({
        name: 'child',
        version: 'v1',
        extends: 'base',
        constraints: { max_cost: 10 },
        prefer: { quality: 'high', cost: 'high', latency: 'high' },
      })
    );
    const child = registry.getPolicy('child', 'v1');
    expect(child?.constraints.max_cost).toBe(10);
    expect(child?.prefer.quality).toBe('high');
  });

  test('version rollback', () => {
    const registry = new PolicyRegistry();
    registry.registerPolicy(makePolicy({ name: 'roll', version: 'v1', constraints: { max_cost: 1 } }));
    registry.registerPolicy(makePolicy({ name: 'roll', version: 'v2', constraints: { max_cost: 2 } }));
    const rolled = registry.rollbackPolicy('roll', 'v1');
    expect(rolled?.constraints.max_cost).toBe(1);
    expect(registry.getLatestVersion('roll')).toBe('v1');
  });
});
