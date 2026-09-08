-- Provider API keys (multi-key rotation support)
CREATE TABLE IF NOT EXISTS provider_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_api_keys_provider ON provider_api_keys(provider);
CREATE INDEX IF NOT EXISTS idx_provider_api_keys_provider_enabled ON provider_api_keys(provider, enabled);

COMMENT ON TABLE provider_api_keys IS 'API keys per provider with rotation support. Multiple keys per provider for rate limit distribution.';

-- Gateway API keys (Bifröst's own keys for client authentication)
CREATE TABLE IF NOT EXISTS gateway_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  rate_limit_rpm INTEGER NOT NULL DEFAULT 60,
  daily_limit_tokens BIGINT NOT NULL DEFAULT 1000000,
  monthly_limit_cost DOUBLE PRECISION NOT NULL DEFAULT 10.00,
  tokens_used_today BIGINT NOT NULL DEFAULT 0,
  tokens_used_this_month BIGINT NOT NULL DEFAULT 0,
  cost_this_month DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE gateway_keys IS 'Bifröst gateway API keys. Clients use these to authenticate with the gateway.';

-- Gateway settings (key-value store)
CREATE TABLE IF NOT EXISTS gateway_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE gateway_settings IS 'General gateway settings. Stores config like default routing strategy, master key hash, etc.';
