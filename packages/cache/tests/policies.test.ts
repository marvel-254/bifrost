import {
  DEFAULT_CACHE_POLICY,
  createCachePolicy,
  createTenantCachePolicy,
  createModelCachePolicy,
  getPolicyForRequest,
  isExpired,
  calculateExpiry,
} from '../src/policies';

describe('Cache Policies', () => {
  describe('DEFAULT_CACHE_POLICY', () => {
    it('should have sensible defaults', () => {
      expect(DEFAULT_CACHE_POLICY.ttlSeconds).toBe(3600);
      expect(DEFAULT_CACHE_POLICY.maxEntries).toBe(10000);
      expect(DEFAULT_CACHE_POLICY.maxSizeBytes).toBe(100 * 1024 * 1024);
      expect(DEFAULT_CACHE_POLICY.evictionPolicy).toBe('LRU');
      expect(DEFAULT_CACHE_POLICY.semanticTtlSeconds).toBe(1800);
      expect(DEFAULT_CACHE_POLICY.semanticSimilarityThreshold).toBe(0.85);
    });
  });

  describe('createCachePolicy', () => {
    it('should create policy with overrides', () => {
      const policy = createCachePolicy({ ttlSeconds: 7200, maxEntries: 5000 });
      expect(policy.ttlSeconds).toBe(7200);
      expect(policy.maxEntries).toBe(5000);
      expect(policy.maxSizeBytes).toBe(DEFAULT_CACHE_POLICY.maxSizeBytes);
    });

    it('should return default policy when no overrides', () => {
      const policy = createCachePolicy();
      expect(policy).toEqual(DEFAULT_CACHE_POLICY);
    });
  });

  describe('createTenantCachePolicy', () => {
    it('should create tenant policy with tenantId', () => {
      const policy = createTenantCachePolicy('tenant-1', { ttlSeconds: 7200 });
      expect(policy.tenantId).toBe('tenant-1');
      expect(policy.ttlSeconds).toBe(7200);
    });
  });

  describe('createModelCachePolicy', () => {
    it('should create model policy with model', () => {
      const policy = createModelCachePolicy('openai/gpt-4o', { ttlSeconds: 7200 });
      expect(policy.model).toBe('openai/gpt-4o');
      expect(policy.ttlSeconds).toBe(7200);
    });
  });

  describe('getPolicyForRequest', () => {
    const defaultPolicy = { ...DEFAULT_CACHE_POLICY };
    const tenantPolicies = new Map([
      ['tenant-1', createTenantCachePolicy('tenant-1', { ttlSeconds: 7200 })],
    ]);
    const modelPolicies = new Map([
      ['openai/gpt-4o', createModelCachePolicy('openai/gpt-4o', { ttlSeconds: 1800 })],
    ]);

    it('should return default policy when no specific policies', () => {
      const policy = getPolicyForRequest(defaultPolicy, new Map(), new Map(), 'unknown', 'unknown');
      expect(policy).toEqual(defaultPolicy);
    });

    it('should apply tenant policy', () => {
      const policy = getPolicyForRequest(defaultPolicy, tenantPolicies, new Map(), 'tenant-1', 'unknown');
      expect(policy.ttlSeconds).toBe(7200);
    });

    it('should apply model policy', () => {
      const policy = getPolicyForRequest(defaultPolicy, new Map(), modelPolicies, 'unknown', 'openai/gpt-4o');
      expect(policy.ttlSeconds).toBe(1800);
    });

    it('should merge tenant and model policies taking minimum TTL', () => {
      const policy = getPolicyForRequest(defaultPolicy, tenantPolicies, modelPolicies, 'tenant-1', 'openai/gpt-4o');
      expect(policy.ttlSeconds).toBe(1800);
    });
  });

  describe('isExpired', () => {
    it('should return true for expired entry', () => {
      expect(isExpired({ expiresAt: Date.now() - 1000 }, Date.now())).toBe(true);
    });

    it('should return false for non-expired entry', () => {
      expect(isExpired({ expiresAt: Date.now() + 1000 }, Date.now())).toBe(false);
    });

    it('should return false for entry with no expiry', () => {
      expect(isExpired({ expiresAt: 0 }, Date.now())).toBe(false);
    });
  });

  describe('calculateExpiry', () => {
    it('should calculate expiry from TTL', () => {
      const now = 1000000;
      const expiry = calculateExpiry(60, now);
      expect(expiry).toBe(now + 60000);
    });

    it('should return 0 for zero TTL', () => {
      const expiry = calculateExpiry(0, 1000000);
      expect(expiry).toBe(0);
    });
  });
});