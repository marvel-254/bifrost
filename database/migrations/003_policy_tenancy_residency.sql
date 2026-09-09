-- Phase 7: Policy, Tenancy, and Data Residency tables

-- Policies
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  policy_yaml TEXT NOT NULL,
  match_tags TEXT[] DEFAULT '{}',
  match_tenant TEXT,
  match_application TEXT,
  constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  require JSONB NOT NULL DEFAULT '{}'::jsonb,
  prefer JSONB NOT NULL DEFAULT '{}'::jsonb,
  fallback JSONB NOT NULL DEFAULT '{}'::jsonb,
  optimization JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_policies_name ON policies(name);
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled);

COMMENT ON TABLE policies IS 'Policy-as-Code definitions. Each row is one policy version.';

-- Policy versions (history / rollback)
CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  version TEXT NOT NULL,
  policy_yaml TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_versions_name ON policy_versions(policy_name);

COMMENT ON TABLE policy_versions IS 'Version history for policies. Supports rollback.';

-- Tenant configs
CREATE TABLE IF NOT EXISTS tenant_configs (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT true,
  routing_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  compression_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  cache_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  cost_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_access JSONB NOT NULL DEFAULT '{}'::jsonb,
  quality_targets JSONB NOT NULL DEFAULT '{}'::jsonb,
  policies TEXT[] DEFAULT '{}',
  data_residency JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenant_configs IS 'Per-tenant configuration with complete isolation.';

-- Residency rules
CREATE TABLE IF NOT EXISTS residency_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT,
  policy_name TEXT,
  allowed_regions TEXT[] DEFAULT '{}',
  prohibited_regions TEXT[] DEFAULT '{}',
  require_residency BOOLEAN NOT NULL DEFAULT false,
  default_region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_residency_rules_tenant ON residency_rules(tenant_id);

COMMENT ON TABLE residency_rules IS 'Data residency rules per tenant and policy.';
