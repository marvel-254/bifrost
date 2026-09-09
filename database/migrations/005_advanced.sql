-- Migration 005: Advanced features (Marketplace, Self-Learning, Context Graph/GC/Recovery)

-- Marketplace tables
CREATE TABLE IF NOT EXISTS marketplace_offers (
    id VARCHAR(255) PRIMARY KEY,
    provider VARCHAR(100) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    capacity_per_day BIGINT NOT NULL DEFAULT 0,
    price_per_token DECIMAL(20, 10) NOT NULL,
    trust_score DECIMAL(5, 2) NOT NULL DEFAULT 0,
    limits JSONB NOT NULL DEFAULT '{}',
    credits_balance BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_verification',
    tenant_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_marketplace_offers_tenant ON marketplace_offers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_provider ON marketplace_offers(provider);
CREATE INDEX IF NOT EXISTS idx_marketplace_offers_status ON marketplace_offers(status);

CREATE TABLE IF NOT EXISTS marketplace_consumption (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    offer_id VARCHAR(255) NOT NULL REFERENCES marketplace_offers(id),
    tokens_used BIGINT NOT NULL,
    credits_spent BIGINT NOT NULL,
    request_id VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_marketplace_consumption_tenant ON marketplace_consumption(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_consumption_offer ON marketplace_consumption(offer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_consumption_created ON marketplace_consumption(created_at);

-- Self-Learning tables
CREATE TABLE IF NOT EXISTS strategy_versions (
    version VARCHAR(100) PRIMARY KEY,
    weights JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at TIMESTAMPTZ,
    rolled_back_at TIMESTAMPTZ,
    parent_version VARCHAR(100),
    training_data_hash VARCHAR(64),
    simulation_result JSONB,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_strategy_versions_status ON strategy_versions(status);

CREATE TABLE IF NOT EXISTS strategy_training_data (
    id VARCHAR(255) PRIMARY KEY,
    decision_id VARCHAR(255) NOT NULL,
    request_type VARCHAR(100),
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(100) NOT NULL,
    account_id VARCHAR(255),
    compression_used BOOLEAN NOT NULL DEFAULT FALSE,
    latency_ms INTEGER NOT NULL,
    tokens_used BIGINT NOT NULL,
    cost DECIMAL(20, 10) NOT NULL,
    error BOOLEAN NOT NULL DEFAULT FALSE,
    fallback_used BOOLEAN NOT NULL DEFAULT FALSE,
    validation_passed BOOLEAN NOT NULL DEFAULT TRUE,
    quality_score DECIMAL(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_data_decision ON strategy_training_data(decision_id);
CREATE INDEX IF NOT EXISTS idx_training_data_model ON strategy_training_data(model);
CREATE INDEX IF NOT EXISTS idx_training_data_provider ON strategy_training_data(provider);
CREATE INDEX IF NOT EXISTS idx_training_data_created ON strategy_training_data(created_at);

-- Context Graph tables
CREATE TABLE IF NOT EXISTS context_graphs (
    request_id VARCHAR(255) PRIMARY KEY,
    nodes JSONB NOT NULL DEFAULT '{}',
    edges JSONB NOT NULL DEFAULT '[]',
    roots JSONB NOT NULL DEFAULT '[]',
    leaves JSONB NOT NULL DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS context_items (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL REFERENCES context_graphs(request_id),
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    tokens INTEGER NOT NULL DEFAULT 0,
    age INTEGER NOT NULL DEFAULT 0,
    referenced BOOLEAN NOT NULL DEFAULT FALSE,
    priority DECIMAL(5, 2) NOT NULL DEFAULT 0.5,
    dependencies JSONB NOT NULL DEFAULT '[]',
    provenance JSONB NOT NULL DEFAULT '{}',
    invariants JSONB NOT NULL DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_items_request ON context_items(request_id);
CREATE INDEX IF NOT EXISTS idx_context_items_type ON context_items(type);

CREATE TABLE IF NOT EXISTS context_archives (
    id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    item JSONB NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason VARCHAR(100) NOT NULL,
    original_graph_edges JSONB NOT NULL DEFAULT '[]',
    recoverable BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_context_archives_request ON context_archives(request_id);
CREATE INDEX IF NOT EXISTS idx_context_archives_recoverable ON context_archives(recoverable);