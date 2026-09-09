import type { NormalizedRequest, NormalizedMessage } from '@bifrost/shared';
import type { ProviderAdapter } from '@bifrost/providers';

export type { NormalizedRequest, NormalizedMessage } from '@bifrost/shared';
export type { ProviderAdapter } from '@bifrost/providers';

// ── Enums / Literals ──────────────────────────────────────────────────────────

export type QualityPreference = 'low' | 'medium' | 'high';
export type CostPreference = 'low' | 'medium' | 'high';
export type LatencyPreference = 'low' | 'medium' | 'high';
export type FallbackStrategy = 'auto' | 'manual' | 'none';
export type CompressionLevel = 'off' | 'safe' | 'balanced' | 'aggressive' | 'auto';
export type DataRegion = 'us' | 'eu' | 'ap' | 'global';

// ── Policy Schema ─────────────────────────────────────────────────────────────

export interface PolicyMatch {
  tags?: string[];
  tenant?: string;
  application?: string;
  conditions: PolicyCondition;
}

export interface PolicyCondition {
  AND: Array<PolicyCondition | PolicyConditionLeaf>;
  OR: Array<PolicyCondition | PolicyConditionLeaf>;
}

export interface PolicyConditionLeaf {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: unknown;
}

export interface PolicyConstraints {
  max_cost?: number;
  max_latency_ms?: number;
  data_region?: string;
  allowed_regions?: string[];
  prohibited_regions?: string[];
}

export interface PolicyRequires {
  tools?: boolean;
  structured_output?: boolean;
  capabilities?: string[];
}

export interface PolicyPreference {
  quality: QualityPreference;
  cost: CostPreference;
  latency: LatencyPreference;
}

export interface PolicyFallback {
  strategy: FallbackStrategy;
}

export interface PolicyOptimization {
  compression: CompressionLevel;
  cache: boolean;
}

export interface Policy {
  name: string;
  priority: number;
  version: string;
  extends?: string;
  enabled: boolean;
  match: PolicyMatch;
  constraints: PolicyConstraints;
  require: PolicyRequires;
  prefer: PolicyPreference;
  fallback: PolicyFallback;
  optimization: PolicyOptimization;
}

export interface PolicyVersion {
  id: string;
  policy_name: string;
  version: string;
  policy_yaml: string;
  created_at: string;
  created_by?: string;
}

// ── Policy Evaluation ─────────────────────────────────────────────────────────

export interface PolicyContext {
  tenantId?: string;
  application?: string;
  tags?: string[];
  request: NormalizedRequest;
}

export interface PolicyDecision {
  matchedPolicy: Policy | null;
  effectiveConstraints: PolicyConstraints;
  routingStrategy: string;
  compressionLevel: CompressionLevel;
  cacheEnabled: boolean;
  allowedProviders: string[];
  allowedRegions: string[];
  fallbackStrategy: FallbackStrategy;
  requiresTools: boolean;
  requiresStructuredOutput: boolean;
  requiredCapabilities: string[];
  qualityPreference: QualityPreference;
  costPreference: CostPreference;
  latencyPreference: LatencyPreference;
}

// ── Tenancy ──────────────────────────────────────────────────────────────────

export interface RoutingPreferences {
  strategy: string;
  weights?: {
    capabilityMatch: number;
    quality: number;
    reliability: number;
    costEfficiency: number;
    latency: number;
    availability: number;
  };
}

export interface CompressionBehavior {
  default_level: CompressionLevel;
  max_compression_ratio: number;
}

export interface CacheConfig {
  enabled: boolean;
  ttl_seconds: number;
  max_entries: number;
  tenant_isolated: boolean;
}

export interface CostLimits {
  daily_max: number;
  monthly_max: number;
  per_request_max: number;
  alert_threshold: number;
}

export interface ProviderAccess {
  allowed: string[];
  blocked: string[];
  multi_account: Record<string, string[]>;
}

export interface QualityTargets {
  min_quality_score: number;
  min_reliability: number;
  max_latency_ms: number;
}

export interface TenantConfig {
  tenant_id: string;
  name: string;
  enabled: boolean;
  routing_preferences: RoutingPreferences;
  compression_behavior: CompressionBehavior;
  cache_config: CacheConfig;
  cost_limits: CostLimits;
  provider_access: ProviderAccess;
  quality_targets: QualityTargets;
  policies: string[];
  data_residency: DataResidencyConfig;
  created_at: string;
  updated_at: string;
}

// ── Data Residency ────────────────────────────────────────────────────────────

export interface DataResidencyConfig {
  allowed_regions: string[];
  prohibited_regions: string[];
  require_residency: boolean;
  default_region?: string;
}

export interface RegionMetadata {
  region: DataRegion;
  provider: string;
  account_id?: string;
}

export interface ResidencyDecision {
  allowed: boolean;
  filteredProviders: string[];
  audit_reason: string;
  region: string;
}

// ── Policy Simulation ─────────────────────────────────────────────────────────

export interface SimulationResult {
  policy_name: string;
  estimated_cost: number;
  estimated_latency_ms: number;
  provider_distribution: Record<string, number>;
  fallback_frequency: number;
  failure_rate: number;
  token_consumption: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  compression_savings: number;
  quality_estimate: number;
  request_count: number;
  warnings: string[];
  comparison?: {
    current_cost: number;
    proposed_cost: number;
    cost_delta_percent: number;
    current_latency_ms: number;
    proposed_latency_ms: number;
    latency_delta_percent: number;
  };
}
