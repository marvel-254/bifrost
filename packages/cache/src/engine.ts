import type { NormalizedRequest, NormalizedResponse } from '@bifrost/shared';
import {
  normalizeRequest,
  createCacheKey,
  type NormalizedRequestForCache,
} from './normalize';
import { exactFingerprint, semanticFingerprint, type SemanticFingerprintConfig } from './fingerprint';
import type { CacheStore, CacheEntry, CachePolicy, CacheHit, CacheEngineConfig, CacheEngineStats, CacheMetrics } from './types';
import { getPolicyForRequest, calculateExpiry, isExpired } from './policies';

export class CacheEngine {
  private store: CacheStore;
  private defaultPolicy: CachePolicy;
  private tenantPolicies: Map<string, CachePolicy>;
  private modelPolicies: Map<string, CachePolicy>;
  private enableSemanticCache: boolean;
  private semanticConfig: SemanticFingerprintConfig;
  private metrics: CacheMetrics;

  constructor(config: CacheEngineConfig) {
    this.store = config.store;
    this.defaultPolicy = config.defaultPolicy;
    this.tenantPolicies = new Map();
    this.modelPolicies = new Map();
    this.enableSemanticCache = config.enableSemanticCache;
    this.semanticConfig = DEFAULT_SEMANTIC_CONFIG;
    this.metrics = {
      hits: 0,
      misses: 0,
      exactHits: 0,
      semanticHits: 0,
      evictions: 0,
      totalLatencyMs: 0,
      cacheSize: 0,
      cacheSizeBytes: 0,
    };

    if (config.tenantPolicies) {
      for (const [tenantId, policy] of config.tenantPolicies) {
        this.tenantPolicies.set(tenantId, policy);
      }
    }
    if (config.modelPolicies) {
      for (const [model, policy] of config.modelPolicies) {
        this.modelPolicies.set(model, policy);
      }
    }
  }

  async lookup(request: NormalizedRequestForCache): Promise<CacheHit | null> {
    const startTime = Date.now();
    const policy = getPolicyForRequest(
      this.defaultPolicy,
      this.tenantPolicies as Map<string, any>,
      this.modelPolicies as Map<string, any>,
      request.tenantId ?? 'default',
      request.model
    );

    const normalized = normalizeRequest(request);
    const exactFp = exactFingerprint(normalized);
    const exactKey = createCacheKey(
      normalized.tenantId ?? 'default',
      normalized.model,
      'exact',
      exactFp
    );

    const exactEntry = await this.store.get(exactKey);
    if (exactEntry && !isExpired(exactEntry)) {
      exactEntry.hitCount++;
      await this.store.set(exactKey, exactEntry);
      const latencyMs = Date.now() - startTime;
      this.recordHit('exact', latencyMs);
      return { entry: exactEntry, matchType: 'exact', latencyMs };
    }

    if (this.enableSemanticCache) {
      const semanticFp = semanticFingerprint(normalized, this.semanticConfig);
      const semanticKey = createCacheKey(
        normalized.tenantId ?? 'default',
        normalized.model,
        'semantic',
        semanticFp
      );

      const semanticEntry = await this.store.get(semanticKey);
      if (semanticEntry && !isExpired(semanticEntry)) {
        semanticEntry.hitCount++;
        await this.store.set(semanticKey, semanticEntry);
        const latencyMs = Date.now() - startTime;
        this.recordHit('semantic', latencyMs);
        return { entry: semanticEntry, matchType: 'semantic', latencyMs };
      }
    }

    this.recordMiss(Date.now() - startTime);
    return null;
  }

  async store(
    request: NormalizedRequestForCache,
    response: NormalizedResponse
  ): Promise<void> {
    const policy = getPolicyForRequest(
      this.defaultPolicy,
      this.tenantPolicies as Map<string, any>,
      this.modelPolicies as Map<string, any>,
      request.tenantId ?? 'default',
      request.model
    );

    const normalized = normalizeRequest(request);
    const { exact, semantic } = computeFingerprints(normalized, this.semanticConfig);

    const now = Date.now();
    const expiresAt = calculateExpiry(policy.ttlSeconds, now);
    const semanticExpiresAt = calculateExpiry(policy.semanticTtlSeconds ?? policy.ttlSeconds, now);

    const exactEntry: CacheEntry = {
      key: createCacheKey(normalized.tenantId ?? 'default', normalized.model, 'exact', exact),
      requestFingerprint: exact,
      semanticFingerprint: semantic,
      response,
      tenantId: normalized.tenantId ?? 'default',
      model: normalized.model,
      provider: response.provider ?? 'unknown',
      createdAt: now,
      expiresAt,
      hitCount: 0,
    };

    await this.store.set(exactEntry.key, exactEntry);

    if (this.enableSemanticCache) {
      const semanticEntry: CacheEntry = {
        key: createCacheKey(normalized.tenantId ?? 'default', normalized.model, 'semantic', semantic),
        requestFingerprint: exact,
        semanticFingerprint: semantic,
        response,
        tenantId: normalized.tenantId ?? 'default',
        model: normalized.model,
        provider: response.provider ?? 'unknown',
        createdAt: now,
        expiresAt: semanticExpiresAt,
        hitCount: 0,
      };
      await this.store.set(semanticEntry.key, semanticEntry);
    }

    this.updateCacheSize();
  }

  async invalidate(pattern: string): Promise<number> {
    const entries = await this.store.getByPattern(pattern);
    let count = 0;
    for (const entry of entries) {
      await this.store.delete(entry.key);
      count++;
    }
    this.updateCacheSize();
    return count;
  }

  async invalidateTenant(tenantId: string): Promise<number> {
    return this.invalidate(`cache:${tenantId}:`);
  }

  async invalidateModel(model: string): Promise<number> {
    return this.invalidate(`cache:.*:${model}:`);
  }

  private recordHit(type: 'exact' | 'semantic', latencyMs: number): void {
    this.metrics.hits++;
    this.metrics.totalLatencyMs += latencyMs;
    if (type === 'exact') {
      this.metrics.exactHits++;
    } else {
      this.metrics.semanticHits++;
    }
  }

  private recordMiss(latencyMs: number): void {
    this.metrics.misses++;
    this.metrics.totalLatencyMs += latencyMs;
  }

  private updateCacheSize(): void {
    this.metrics.cacheSize = this.store.size() as unknown as number;
  }

  getStats(): CacheEngineStats {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      avgLatencyMs: total > 0 ? this.metrics.totalLatencyMs / total : 0,
    };
  }

  resetStats(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      exactHits: 0,
      semanticHits: 0,
      evictions: 0,
      totalLatencyMs: 0,
      cacheSize: 0,
      cacheSizeBytes: 0,
    };
  }

  setSemanticConfig(config: Partial<SemanticFingerprintConfig>): void {
    this.semanticConfig = { ...this.semanticConfig, ...config };
  }

  setTenantPolicy(tenantId: string, policy: CachePolicy): void {
    this.tenantPolicies.set(tenantId, policy);
  }

  setModelPolicy(model: string, policy: CachePolicy): void {
    this.modelPolicies.set(model, policy);
  }

  getStore(): CacheStore {
    return this.store;
  }
}

function computeFingerprints(
  request: NormalizedRequestForCache,
  config: SemanticFingerprintConfig
): { exact: string; semantic: string } {
  return {
    exact: exactFingerprint(request),
    semantic: semanticFingerprint(request, config),
  };
}

const DEFAULT_SEMANTIC_CONFIG: SemanticFingerprintConfig = {
  includeTaskType: true,
  includeInstructions: true,
  includeToolSchemas: true,
  includeOutputSchema: true,
  includeSystemPrompt: true,
  ignoreUserMessageWording: true,
  ignoreExampleValues: true,
};