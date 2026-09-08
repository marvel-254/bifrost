import type { CachePolicy, TenantCachePolicy, ModelCachePolicy } from './types';

export const DEFAULT_CACHE_POLICY: CachePolicy = {
  ttlSeconds: 3600,
  maxEntries: 10000,
  maxSizeBytes: 100 * 1024 * 1024,
  evictionPolicy: 'LRU',
  semanticTtlSeconds: 1800,
  semanticSimilarityThreshold: 0.85,
};

export function createCachePolicy(overrides: Partial<CachePolicy> = {}): CachePolicy {
  return { ...DEFAULT_CACHE_POLICY, ...overrides };
}

export function createTenantCachePolicy(tenantId: string, overrides: Partial<CachePolicy> = {}): TenantCachePolicy {
  return {
    tenantId,
    ...DEFAULT_CACHE_POLICY,
    ...overrides,
  };
}

export function createModelCachePolicy(model: string, overrides: Partial<CachePolicy> = {}): ModelCachePolicy {
  return {
    model,
    ...DEFAULT_CACHE_POLICY,
    ...overrides,
  };
}

export function getPolicyForRequest(
  defaultPolicy: CachePolicy,
  tenantPolicies: Map<string, TenantCachePolicy>,
  modelPolicies: Map<string, ModelCachePolicy>,
  tenantId: string,
  model: string
): CachePolicy {
  const tenantPolicy = tenantPolicies.get(tenantId);
  const modelPolicy = modelPolicies.get(model);

  if (tenantPolicy && modelPolicy) {
    return mergePolicies(tenantPolicy, modelPolicy);
  }
  if (tenantPolicy) {
    return { ...defaultPolicy, ...tenantPolicy };
  }
  if (modelPolicy) {
    return { ...defaultPolicy, ...modelPolicy };
  }
  return defaultPolicy;
}

function mergePolicies(a: CachePolicy, b: CachePolicy): CachePolicy {
  return {
    ttlSeconds: Math.min(a.ttlSeconds, b.ttlSeconds),
    maxEntries: Math.min(a.maxEntries, b.maxEntries),
    maxSizeBytes: Math.min(a.maxSizeBytes, b.maxSizeBytes),
    evictionPolicy: a.evictionPolicy,
    semanticTtlSeconds: Math.min(a.semanticTtlSeconds ?? DEFAULT_CACHE_POLICY.semanticTtlSeconds!, b.semanticTtlSeconds ?? DEFAULT_CACHE_POLICY.semanticTtlSeconds!),
    semanticSimilarityThreshold: Math.max(a.semanticSimilarityThreshold ?? DEFAULT_CACHE_POLICY.semanticSimilarityThreshold!, b.semanticSimilarityThreshold ?? DEFAULT_CACHE_POLICY.semanticSimilarityThreshold!),
  };
}

export function isExpired(entry: { expiresAt: number }, now: number = Date.now()): boolean {
  return entry.expiresAt > 0 && entry.expiresAt < now;
}

export function calculateExpiry(ttlSeconds: number, now: number = Date.now()): number {
  return ttlSeconds > 0 ? now + ttlSeconds * 1000 : 0;
}