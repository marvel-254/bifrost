# Bifröst — PLAN.md

## 1. Project Definition

Bifröst is a lightweight, OpenAI-compatible AI model gateway and intelligent router.

Primary objective:

> One API. Many models. Intelligent routing.

First release runs on serverless stack:
- Vercel for API hosting
- Neon PostgreSQL for persistence
- Cloudflare for DNS, edge protection, rate limiting
- External LLM providers / local Ollama for inference

Bifröst must not become a full LiteLLM replacement in MVP.

---

## 2. Product Goals

1. One OpenAI-compatible API endpoint
2. Abstract provider APIs behind adapters
3. Route between multiple models/providers
4. Configurable routing strategies
5. Reliable fallbacks
6. Track latency, tokens, cost, success rates
7. Monitor provider/model health
8. Streaming responses
9. Protect provider credentials
10. Simple dashboard
11. Useful to AI coding agents (OpenCode, Hermes)
12. Deployable on free/low-cost infrastructure

---

## 3. MVP Scope

### Required

- TypeScript implementation
- OpenAI-compatible `/v1/chat/completions`
- `/v1/models`, `/health`
- Streaming
- Provider abstraction
- 3+ provider integrations (Gemini, Groq, OpenRouter, Anthropic, Ollama)
- Model registry
- Basic routing engine
- Manual, Priority, Cheapest, Fastest, Balanced routing
- Automatic fallback
- Timeouts, retry limits
- Basic provider health tracking
- API-key authentication
- Request metrics, token/cost tracking
- Neon PostgreSQL persistence
- Basic web dashboard
- Tests, documentation

### Non-Goals (MVP)

- Custom LLM inference, GPU infra, fine-tuning
- Complete OpenAI API parity
- Every provider
- Complex enterprise billing, multi-region, K8s
- Distributed job queues
- Full ML routing
- Long-term prompt storage by default

---

## 4. Target Architecture

```
AI Agent → Cloudflare → Vercel (Bifröst API) → Provider Adapters → Neon PG
                          ↓
              Gateway + Auth + Analyzer + Router + Provider Mgr + Fallback + Metrics
```

Stateless app layer. Persistent config/analytics in PostgreSQL.

---

## 5. Repository Structure

```
bifrost/
├── apps/
│   ├── api/          # Next.js API (Vercel)
│   └── web/          # Dashboard (future)
├── packages/
│   ├── router/       # Routing engine, policy, scoring
│   ├── providers/    # Provider adapters, registry
│   ├── models/       # Model registry, capabilities
│   ├── compression/  # Prompt/Tool compression engine
│   ├── cache/        # Semantic cache
│   ├── telemetry/    # Metrics, tracing, optimizer score
│   ├── security/     # Auth, secrets, rate limiting
│   └── shared/       # Types, db, utilities
├── database/
│   ├── schema.sql    # Canonical schema
│   └── migrations/   # Ordered migrations
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── AGENTS.md
├── PLAN.md
└── package.json
```

---

## 6. Core Interfaces

### Provider Adapter

```typescript
interface ProviderAdapter {
  chat(request: NormalizedRequest): Promise<NormalizedResponse>;
  stream(request: NormalizedRequest): AsyncIterable<NormalizedStreamEvent>;
  embeddings(request: NormalizedEmbeddingRequest): Promise<NormalizedEmbeddingResponse>;
  health(): Promise<ProviderHealth>;
  capabilities(): ProviderCapabilities;
}
```

Provider logic stays in adapters. Router never contains provider-specific HTTP.

### Model Metadata

```
id, provider, display_name, context_window, capabilities,
input_price, output_price, enabled
```

### Routing Candidate

```
model, provider, capabilities, quality_score, cost_score,
latency_score, reliability_score, availability_score, priority
```

---

## 7. Routing Engine (v1 = Deterministic)

```
score = capability_match*0.30 + quality*0.25 + reliability*0.15
      + cost_efficiency*0.15 + latency*0.10 + availability*0.05
```

Weights configurable. Hard constraints applied first:
- Required capability
- Required context size
- Disabled provider/model
- User restriction
- Budget restriction

---

## 8. Routing Modes (in order)

1. **Manual** — explicit model/provider
2. **Priority** — first eligible healthy model
3. **Cheapest** — lowest-cost eligible
4. **Fastest** — lowest-latency (recent measurements)
5. **Balanced** — weighted scoring
6. **Automatic** — classify request, select strategy (later milestone)

---

## 9. Request Classification

Deterministic heuristics initially:
```
simple, coding, debugging, reasoning, research, summarization,
creative, vision, long_context, tool_use, agent_planning, code_review
```

No LLM call for classification unless tradeoff proven.

---

## 10. Fallback System

Per-decision chain: `primary → fallback_1 → fallback_2`

Triggers: timeout, provider unavailable, rate limit, temporary failure, model unavailable, invalid response.

Bounded retries. No infinite retries. No retry on non-transient errors.

---

## 11. Provider Health

Track: success_rate, failure_rate, avg_latency, recent_failures, last_success, last_failure, health_state

States: `healthy | degraded | unhealthy | disabled`

Auto-recover after successful checks.

---

## 12. Cost Tracking

Track: input_tokens, output_tokens, total_tokens, estimated_cost, provider, model, duration_ms, status, timestamp

Distinguish: provider-reported | estimated | unknown cost. Never present estimate as exact charge.

---

## 13. Database (Neon PostgreSQL)

Core entities: users, projects, api_keys, providers, models, routing_policies, routing_rules, requests, request_attempts, model_metrics, provider_metrics, budgets, context_items, cache_entries, quota_forecasts, provider_health, circuit_breakers, cooldowns

No full prompts/responses by default. Opt-in only.

---

## 14. API

```
POST /v1/chat/completions
GET  /v1/models
GET  /health
POST /v1/responses (future)
POST /v1/embeddings (future)
```

Accept common OpenAI fields. Fail clearly on unsupported features. Streaming required.

---

## 15. Security

- API auth, secure secret storage, per-key rate limiting
- Input-size limits, request timeouts, retry/fallback limits
- CORS, env-based secrets, audit logging
- No provider secrets to browser clients
- API keys hashed/encrypted appropriately

---

## 16. Dashboard (Initial)

- Overview: requests, success rate, latency, cost, active providers
- Providers: status, models, latency, success rate
- Models: capabilities, context, price, routing score
- Routing: strategy, priorities, fallbacks, weights, constraints
- Requests: timestamp, model, provider, tokens, cost, latency, status
- No prompt/response content by default

---

## 16.1 Dashboard — Compression Engine (Phase 3.5)

- Compression Overview: original vs optimized tokens, savings %, level distribution
- Pipeline Breakdown: per-pass token reduction (dedup, boilerplate, structural, pruning)
- Compression Level Distribution: histogram of levels used across requests
- Rule Registry: boilerplate rules, canonicalization mappings, confidence thresholds
- Tool Compression: by type (terminal, logs, diff, JSON, search, DB, MCP, web)
- Safety Metrics: confidence distribution, validation failures, fallback to original
- Per-Request Trace: side-by-side original/optimized, transformation list, latency

---

## 16.2 Dashboard — Semantic Cache (Phase 4)

- Cache Overview: hit rate, exact vs semantic hits, avg latency saved
- Cache Entries: tenant, model, fingerprint, TTL, size, age, quality score
- Invalidation: manual purge, TTL expiry, semantic drift detection
- Performance: lookup latency, storage cost, eviction rate
- Per-Tenant Breakdown: hit rate, size, top cached patterns

---

## 16.3 Dashboard — Reliability (Phase 5)

- Circuit Breakers: state (closed/open/half-open), failure counts, recovery probes
- Provider Cooldowns: active cooldowns, reason, remaining time, escalation history
- Fallback Chains: trigger distribution (429, timeout, 5xx, context), success rates
- Self-Healing: degradation events, quarantine actions, recovery confirmations
- Backpressure: queue depths, concurrency utilization, rejection rates by priority
- Stream Keepalive: idle detections, heartbeats sent, failover events
- Multi-Account: quota remaining, rotation decisions, health per account
- Priority Queues: wait times, throughput, starvation detection

---

## 16.4 Dashboard — Intelligence (Phase 6)

- Auto-Combo: candidate rankings, score breakdowns, selection rationale
- Escalation: escalation paths, cost/quality tradeoffs, success rates
- Provider Reputation: multi-dimensional scores by workload, trend lines
- Model Regression: baseline vs current, alert thresholds, auto-quarantine events
- Quota Forecasting: projected exhaustion, routing adjustments, alerts
- Cost Optimization: estimated vs actual, compression/cache/fallback impact
- Spend Guardrails: limit utilization, warning/downgrade/queue/reject events

---

## 16.5 Dashboard — Policy & Tenancy (Phase 7)

- Policy Editor: YAML editor with validation, preview, version history
- Policy Simulation: what-if against historical traffic, cost/latency/quality estimates
- Tenant Overview: independent routing, compression, cache, limits, provider access
- Data Residency: region compliance, filtered providers, audit trail
- Policy Conflicts: detection, resolution suggestions, override audit

---

## 16.6 Dashboard — Observability (Phase 8)

- Optimizer Score: per-request breakdown, trends, component drill-down
- Full Request Trace: timeline view, span details, error annotations
- Shadow Routing: shadow vs production comparison, statistical significance
- Replay Benchmarks: dataset management, model/strategy/compression comparisons
- What-If Simulator: policy/config changes → projected impact across metrics
- Alerting: thresholds, notifications, runbook links

---

## 16.7 Dashboard — Advanced (Phase 9)

- Quota Marketplace: capacity offers, consumption, credits, trust scores
- Self-Learning: strategy versions, offline simulation results, rollback controls
- Context Graph: dependency visualization, GC candidates, recovery actions
- Context Archive: browsable recoverable context, on-demand restoration

---

## 17. Compression Engine (Phase 3.5 — Post-MVP)

Deterministic, LLM-free. Adaptive levels based on context utilization:

| Utilization | Level | Description |
|-------------|-------|-------------|
| < 25% | 0 | Passthrough |
| 25–50% | 1 | Safe cleanup (whitespace, metadata) |
| 50–70% | 2 | Boilerplate + structural compression |
| 70–85% | 3 | Deduplication + context pruning |
| 85–95% | 4 | Aggressive context optimization |
| > 95% | 5 | Emergency budget enforcement |

### Pipeline Passes

1. **Token/Context Analysis** — per-segment token counts, model context limit from registry
2. **Boilerplate Detection** — configurable rule registry, normalize filler phrases
3. **Prompt Canonicalization** — deterministic mapping (FIND_BUGS, ANALYZE, SUMMARIZE, etc.)
4. **Structural Compression** — verbose → compact explicit structures (TASK/FOCUS/CONSTRAINT)
5. **Context Deduplication** — hash-based, preserve semantic repetition
6. **Context Pruning** — priority-ordered: duplicates → stale tools → irrelevant history
7. **Metadata Optimization** — compress/replace verbose metadata

### Safety

- Confidence classifications: SAFE (dedup) → HIGH (structural) → MEDIUM (pruning) → LOW (aggressive)
- Configurable minimum confidence threshold
- Default conservative: if uncertain, preserve
- Multi-pass with stop-at-budget
- Original request always retained for fallback/debug

### Tool Output Compression

Type-specific optimizers: terminal output, logs, git diff, JSON, search results, DB results, MCP, web content, stack traces

---

## 18. Semantic Cache (Phase 4)

Pipeline: normalize → cache lookup → hit:return / miss:execute→store

Cache keys: tenant + model + provider + request fingerprint + semantic fingerprint

Configurable TTL, policies. Exact + semantic matching.

---

## 19. Reliability Layer (Phase 5)

- **Circuit Breakers** — per provider/account/model, states: CLOSED/OPEN/HALF_OPEN
- **Provider Cooldowns** — adaptive: 429→30s→2m, 5xx→15s→5m, auth failure→disable
- **Auto-Fallback Chains** — error-type-aware (429→rotate account/provider, timeout→alt provider, context-too-large→compress→larger-model)
- **Self-Healing** — detect degradation → reduce traffic → quarantine → test recovery → restore
- **Backpressure** — concurrency limits, queues, priority queues, rate shaping, adaptive concurrency
- **Stream Keepalive** — idle detection, heartbeat, client/provider disconnect handling, failover where safe
- **Multi-Account Rotation** — quota/rate-limit/health/cooldown/performance aware (not round-robin)
- **Priority Queues** — critical/high/normal/low/background with separate limits

---

## 20. Intelligence Layer (Phase 6+)

- **Auto-Combo Engine** — dynamically build ranked route candidates from: task, capabilities, context, budget, health, quota, history
- **Automatic Escalation** — start cheap, escalate on validation failure/complexity, track escalation cost/success
- **Provider Reputation** — multi-dimensional scores by workload (success, latency, timeouts, 429, quota reliability, validation, quality)
- **Model Regression Detection** — track quality/latency/errors/tokens/cost over time vs baseline
- **Quota Forecasting** — predict exhaustion, use in routing
- **Cost Optimization** — pre-routing cost estimation with compression/cache/fallback probabilities
- **Spend Guardrails** — per-request/user/tenant/app/daily/monthly limits with warn/downgrade/queue/reject

---

## 21. Policy & Tenancy (Phase 7)

### Policy-as-Code (YAML)

```yaml
policy:
  name: production-coding
  match:
    tags: [coding, production]
  constraints:
    max_cost: 0.03
    max_latency_ms: 2000
    data_region: eu
  require:
    tools: true
    structured_output: true
  prefer:
    quality: high
  optimization:
    compression: balanced
    cache: true
```

### Per-Tenant Isolation

Independent routing, compression, cache, cost limits, provider access, quality targets, policies. No telemetry leakage.

### Data Residency

Route filtering by allowed_regions. Auditable in traces.

---

## 22. Observability & Evaluation (Phase 8)

### Optimizer Score (per-request)

```
Compression      42%
Cache            MISS
Route efficiency 91%
Provider health  97%
Cost efficiency  88%
Latency efficiency 94%
Overall          91/100
```

Explainable, componentized.

### Full Request Tracing

Trace ID with: auth, policy, classification, compression, cache, routing, candidates, selection, retries, fallbacks, streaming, validation, response, cost. Structured logs + OpenTelemetry.

### Shadow Routing

Config % through alternative routes (evaluation only). Compare quality/latency/tokens/cost/errors. Strict shadow budget.

### Replayable Benchmarks

Anonymized production replay → compare models/strategies/compression/policies.

### What-If Simulator

Test proposed policy against historical traffic → estimated cost/latency/provider dist/fallback rate/quality.

---

## 23. Advanced (Phase 9+)

- **Quota Marketplace** — trusted participant capacity sharing, credential broker, tenant isolation, opt-in
- **Self-Learning Routing** — versioned strategies, rollbackable, offline simulation before production
- **Context Dependency Graph** — references/dependencies/invariants/provenance for safe pruning
- **Context Garbage Collection** — stale/duplicate/superseded/unreferenced → recoverable archive
- **Recoverable Context** — lossy active + lossless archive, on-demand recovery

---

## 24. Development Phases

| Phase | Focus | Key Deliverables |
|-------|-------|------------------|
| **0** | Repo Audit | Inspect stack, conventions, tests, deploy config |
| **1** | Gateway | API server, auth, `/health`, `/v1/models`, `/v1/chat/completions`, 1 provider, streaming, error normalization |
| **2** | Provider Abstraction | Common interface, registry, 3 providers, model registry, adapters |
| **3** | Routing | Manual, Priority, Cheapest, Fastest, Balanced + unit tests |
| **3.5** | **Compression Engine** | Analyzer, adaptive levels, boilerplate, canonicalization, structural, dedup, pruning, tool compression, safety, telemetry |
| **4** | Cache | Semantic cache, normalization, fingerprinting, policies |
| **5** | Reliability | Circuit breakers, cooldowns, auto-fallback, self-healing, backpressure, stream keepalive, multi-account, priority queues |
| **6** | Intelligence | Auto-Combo, escalation, reputation, regression detection, quota forecasting, cost optimization, guardrails |
| **7** | Policy/Tenancy | Policy-as-code, per-tenant optimization, data residency |
| **8** | Observability | Optimizer score, full tracing, shadow routing, replay benchmarks, what-if simulator |
| **9** | Advanced | Quota marketplace, self-learning, context graph/GC/recovery |

---

## 25. Testing Strategy

**Unit:** routing scores, constraints, provider selection, fallback order, cost calc, classification, compression passes, cache keys, circuit breakers, policy eval

**Integration:** API→router, router→adapter, DB persistence, provider failure, fallback, streaming, compression pipeline, cache hit/miss

**E2E:** Client→Bifröst→Provider→Stream + failure paths

**Regression:** every production bug gets a test

---

## 26. Performance Requirements

- Router overhead minimal (measure: routing decision, gateway, provider, DB latency)
- No per-token DB queries
- Streaming: no full-response buffering
- Compression latency < 50ms for typical requests

---

## 27. Deployment

```
Frontend/API → Vercel
Database     → Neon
DNS/Edge     → Cloudflare
Inference    → External providers / Ollama
```

Documented env vars. No secrets committed. Dev works on free tiers.

---

## 28. Free-Tier Principle

Minimize infra cost. Router needs no GPUs. Verify current limits before prod.

---

## 29. MVP Complete Definition

Developer can configure OpenAI client → Bifröst and:
1. Authenticate
2. List models
3. Send chat completion
4. Receive streamed response
5. Route between providers
6. Trigger controlled fallback
7. View metrics
8. Configure routing strategy
9. Deploy to serverless stack
10. Run full test suite

---

## 30. Failure Philosophy

```
safe behavior > correctness > availability > cost > aggressive optimization
```

- Uncertain optimization → keep information
- Low routing confidence → safest viable route
- Compression validation fails → revert
- All providers fail → clear normalized error
- Never silently corrupt requests

---

## 31. API Configuration

```json
{
  "model": "bifrost/auto",
  "messages": [],
  "bifrost": {
    "optimization": "auto",
    "routing": "balanced",
    "cache": true,
    "fallback": true
  }
}
```

Advanced:
```json
{
  "bifrost": {
    "tags": ["coding", "production"],
    "max_cost": 0.03,
    "max_latency_ms": 2000,
    "priority": "high",
    "data_region": "eu",
    "optimization": "aggressive"
  }
}
```

---

## 32. Long-Term Vision

```
API Gateway → LLM Gateway → Intelligent Router → Agent-Aware → Adaptive AI Traffic Control
```

Optimization dimensions: quality, cost, latency, reliability, availability, context, capability

Core principle: **Applications describe what they need. Bifröst determines where the request should go.**

Execution lifecycle:
```
UNDERSTAND → OPTIMIZE → CACHE → PREDICT → ROUTE → EXECUTE → VALIDATE → RECOVER → OBSERVE → LEARN
```