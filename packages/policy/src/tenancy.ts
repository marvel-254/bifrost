import type { TenantConfig, RoutingPreferences, CompressionBehavior, CacheConfig, CostLimits, ProviderAccess, QualityTargets, DataResidencyConfig } from './types';

const DEFAULT_ROUTING_PREFERENCES: RoutingPreferences = {
  strategy: 'balanced',
  weights: {
    capabilityMatch: 0.30,
    quality: 0.25,
    reliability: 0.15,
    costEfficiency: 0.15,
    latency: 0.10,
    availability: 0.05,
  },
};

const DEFAULT_COMPRESSION_BEHAVIOR: CompressionBehavior = {
  default_level: 'auto',
  max_compression_ratio: 0.5,
};

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  enabled: true,
  ttl_seconds: 300,
  max_entries: 10000,
  tenant_isolated: true,
};

const DEFAULT_COST_LIMITS: CostLimits = {
  daily_max: 100,
  monthly_max: 1000,
  per_request_max: 10,
  alert_threshold: 0.8,
};

const DEFAULT_PROVIDER_ACCESS: ProviderAccess = {
  allowed: [],
  blocked: [],
  multi_account: {},
};

const DEFAULT_QUALITY_TARGETS: QualityTargets = {
  min_quality_score: 0.7,
  min_reliability: 0.9,
  max_latency_ms: 5000,
};

const DEFAULT_RESIDENCY: DataResidencyConfig = {
  allowed_regions: ['us', 'eu', 'ap', 'global'],
  prohibited_regions: [],
  require_residency: false,
};

export class TenantManager {
  private configs: Map<string, TenantConfig> = new Map();
  private providerOverrides: Map<string, Map<string, string[]>> = new Map();
  private modelOverrides: Map<string, Map<string, string[]>> = new Map();
  private cacheStores: Map<string, unknown> = new Map();
  private telemetryNamespaces: Map<string, string> = new Map();

  getTenantConfig(tenantId: string): TenantConfig {
    const existing = this.configs.get(tenantId);
    if (existing) return existing;
    const now = new Date().toISOString();
    const config: TenantConfig = {
      tenant_id: tenantId,
      name: tenantId,
      enabled: true,
      routing_preferences: { ...DEFAULT_ROUTING_PREFERENCES },
      compression_behavior: { ...DEFAULT_COMPRESSION_BEHAVIOR },
      cache_config: { ...DEFAULT_CACHE_CONFIG },
      cost_limits: { ...DEFAULT_COST_LIMITS },
      provider_access: { ...DEFAULT_PROVIDER_ACCESS },
      quality_targets: { ...DEFAULT_QUALITY_TARGETS },
      policies: [],
      data_residency: { ...DEFAULT_RESIDENCY },
      created_at: now,
      updated_at: now,
    };
    this.configs.set(tenantId, config);
    return config;
  }

  updateTenantConfig(tenantId: string, partial: Partial<TenantConfig>): TenantConfig {
    const current = this.getTenantConfig(tenantId);
    const updated: TenantConfig = {
      ...current,
      ...partial,
      tenant_id: tenantId,
      routing_preferences: partial.routing_preferences
        ? { ...current.routing_preferences, ...partial.routing_preferences }
        : current.routing_preferences,
      compression_behavior: partial.compression_behavior
        ? { ...current.compression_behavior, ...partial.compression_behavior }
        : current.compression_behavior,
      cache_config: partial.cache_config
        ? { ...current.cache_config, ...partial.cache_config }
        : current.cache_config,
      cost_limits: partial.cost_limits
        ? { ...current.cost_limits, ...partial.cost_limits }
        : current.cost_limits,
      provider_access: partial.provider_access
        ? { ...current.provider_access, ...partial.provider_access }
        : current.provider_access,
      quality_targets: partial.quality_targets
        ? { ...current.quality_targets, ...partial.quality_targets }
        : current.quality_targets,
      data_residency: partial.data_residency
        ? { ...current.data_residency, ...partial.data_residency }
        : current.data_residency,
      updated_at: new Date().toISOString(),
    };
    this.configs.set(tenantId, updated);
    return updated;
  }

  deleteTenant(tenantId: string): boolean {
    return this.configs.delete(tenantId);
  }

  getAllTenants(): TenantConfig[] {
    return Array.from(this.configs.values());
  }

  setProviderOverrides(tenantId: string, overrides: Record<string, string[]>): void {
    const map = new Map(Object.entries(overrides));
    this.providerOverrides.set(tenantId, map);
  }

  getProviderOverrides(tenantId: string): Record<string, string[]> {
    const map = this.providerOverrides.get(tenantId);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  setModelOverrides(tenantId: string, overrides: Record<string, string[]>): void {
    const map = new Map(Object.entries(overrides));
    this.modelOverrides.set(tenantId, map);
  }

  getModelOverrides(tenantId: string): Record<string, string[]> {
    const map = this.modelOverrides.get(tenantId);
    if (!map) return {};
    return Object.fromEntries(map);
  }

  getIsolatedCacheKey(tenantId: string, key: string): string {
    return `tenant:${tenantId}:${key}`;
  }

  getIsolatedTelemetryNamespace(tenantId: string): string {
    let ns = this.telemetryNamespaces.get(tenantId);
    if (!ns) {
      ns = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      this.telemetryNamespaces.set(tenantId, ns);
    }
    return ns;
  }

  isTenantEnabled(tenantId: string): boolean {
    return this.configs.get(tenantId)?.enabled ?? true;
  }

  getEffectiveResidency(tenantId: string): DataResidencyConfig {
    return this.configs.get(tenantId)?.data_residency || DEFAULT_RESIDENCY;
  }

  getEffectiveCostLimits(tenantId: string): CostLimits {
    return this.configs.get(tenantId)?.cost_limits || DEFAULT_COST_LIMITS;
  }

  getEffectiveProviderAccess(tenantId: string): ProviderAccess {
    return this.configs.get(tenantId)?.provider_access || DEFAULT_PROVIDER_ACCESS;
  }
}

export const tenantManager = new TenantManager();
