import type { NormalizedRequest, NormalizedResponse } from '@bifrost/shared';

export interface QualityMetadata {
  score: number;
  feedback?: string;
  validated: boolean;
  validatedAt?: number;
}

export interface CacheEntry {
  key: string;
  requestFingerprint: string;
  semanticFingerprint: string;
  response: NormalizedResponse;
  tenantId: string;
  model: string;
  provider: string;
  createdAt: number;
  expiresAt: number;
  hitCount: number;
  qualityMetadata?: QualityMetadata;
}

export interface NormalizedRequestForCache extends NormalizedRequest {
  tenantId?: string;
}

export interface CachePolicy {
  ttlSeconds: number;
  maxEntries: number;
  maxSizeBytes: number;
  evictionPolicy: 'LRU' | 'LFU';
  semanticTtlSeconds?: number;
  semanticSimilarityThreshold?: number;
}

export interface TenantCachePolicy extends CachePolicy {
  tenantId: string;
}

export interface ModelCachePolicy extends CachePolicy {
  model: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  exactHits: number;
  semanticHits: number;
  evictions: number;
  totalLatencyMs: number;
  cacheSize: number;
  cacheSizeBytes: number;
}

export interface CacheHit {
  entry: CacheEntry;
  matchType: 'exact' | 'semantic';
  latencyMs: number;
}

export interface CacheStore {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  size(): Promise<number>;
  getByPattern(pattern: string): Promise<CacheEntry[]>;
}

export interface CacheEngineConfig {
  store: CacheStore;
  defaultPolicy: CachePolicy;
  tenantPolicies?: Map<string, TenantCachePolicy>;
  modelPolicies?: Map<string, ModelCachePolicy>;
  enableSemanticCache: boolean;
}

export interface CacheEngineStats extends CacheMetrics {
  hitRate: number;
  avgLatencyMs: number;
}