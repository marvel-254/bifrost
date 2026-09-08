# Bifröst — PLAN.md

## 1. Project Definition

Bifröst is a lightweight, OpenAI-compatible AI model gateway and intelligent router.

Primary objective:

> One API. Many models. Intelligent routing.

The first release must remain small enough to run on a serverless stack:

- Vercel for API/application hosting
- Neon PostgreSQL for persistent data
- Cloudflare for DNS, edge protection, and optional rate limiting
- External LLM providers and/or local Ollama models for inference

Bifröst must not attempt to become a full LiteLLM replacement in its first release.

---

## 2. Product Goals

Bifröst should:

1. Provide one OpenAI-compatible API endpoint.
2. Abstract provider-specific APIs behind provider adapters.
3. Route requests between multiple models/providers.
4. Support configurable routing strategies.
5. Provide reliable fallbacks.
6. Track latency, tokens, cost estimates, and success rates.
7. Monitor provider/model health.
8. Support streaming responses.
9. Protect provider credentials.
10. Provide a simple dashboard.
11. Be useful to AI coding agents such as OpenCode and Hermes.
12. Be deployable using free/low-cost infrastructure during development.

---

## 3. MVP Scope

### Required

- TypeScript implementation.
- OpenAI-compatible `/v1/chat/completions`.
- `/v1/models`.
- `/health`.
- Streaming.
- Provider abstraction.
- At least three provider integrations.
- Model registry.
- Basic routing engine.
- Manual routing.
- Priority routing.
- Cheapest routing.
- Fastest routing.
- Balanced routing.
- Automatic fallback.
- Timeouts.
- Retry limits.
- Basic provider health tracking.
- API-key authentication.
- Request metrics.
- Token/cost tracking where provider information permits.
- Neon PostgreSQL persistence.
- Basic web dashboard.
- Tests.
- Documentation.

### Initial providers

Target these providers, subject to their current API availability and compatible terms:

- Google Gemini
- Groq
- OpenRouter
- Anthropic
- Ollama

The implementation must not require all five for the first working milestone. Start with the smallest useful provider set and expand.

---

## 4. Non-Goals

Do not implement these in the MVP:

- Custom LLM inference.
- GPU infrastructure.
- Fine-tuning.
- Complete OpenAI API parity.
- Every LLM provider.
- Complex enterprise billing.
- Multi-region infrastructure.
- Kubernetes.
- Distributed job queues.
- Full machine-learning routing.
- Long-term prompt storage by default.
- A direct clone of LiteLLM, RouteLLM, or OmniRoute.

---

## 5. Target Architecture

```text
                    AI Agent / Application
                              |
                              | OpenAI-compatible API
                              v
                         Cloudflare
                     DNS / Edge Protection
                              |
                              v
                           Vercel
                    +-------------------+
                    |     Bifröst       |
                    |                   |
                    | API Gateway       |
                    | Auth              |
                    | Request Analyzer  |
                    | Routing Engine    |
                    | Provider Manager  |
                    | Fallback Engine   |
                    | Metrics           |
                    +---------+---------+
                              |
               +--------------+--------------+
               |              |              |
               v              v              v
            Gemini          Groq         OpenRouter
               |              |              |
               +--------------+--------------+
                              |
                          Anthropic
                              |
                           Ollama

                              |
                              v
                       Neon PostgreSQL
```

Bifröst must remain stateless at the application layer wherever practical.

Persistent configuration and analytics belong in PostgreSQL.

---

## 6. Repository Structure

Recommended structure:

```text
bifrost/
├── apps/
│   ├── web/
│   └── api/
├── packages/
│   ├── router/
│   ├── providers/
│   ├── models/
│   ├── classifier/
│   ├── telemetry/
│   ├── security/
│   └── shared/
├── database/
│   ├── schema/
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
├── AGENTS.md
├── PLAN.md
├── README.md
└── package.json
```

The implementation may simplify this structure initially. Do not create packages merely for organizational appearance.

---

## 7. Core Interfaces

### Provider Adapter

Every provider should implement a common interface conceptually equivalent to:

```text
authenticate()
listModels()
complete()
stream()
healthCheck()
estimateCost()
```

Provider-specific logic must stay inside provider adapters.

The routing engine must not contain provider-specific HTTP logic.

### Model

A model should expose metadata such as:

```text
id
provider
display_name
context_window
capabilities
input_price
output_price
enabled
```

### Routing Candidate

A candidate should expose enough information for the router to evaluate:

```text
model
provider
capabilities
quality_score
cost_score
latency_score
reliability_score
availability_score
priority
```

---

## 8. Routing Engine

Version 1 uses deterministic scoring.

Example:

```text
score =
    capability_match * 0.30
  + quality          * 0.25
  + reliability      * 0.15
  + cost_efficiency  * 0.15
  + latency          * 0.10
  + availability     * 0.05
```

Weights must be configurable.

The router must never choose a model that cannot satisfy hard requirements such as:

- Required capability.
- Required context size.
- Disabled provider.
- Disabled model.
- Explicit user restriction.
- Budget restriction.

Hard constraints are applied before scoring.

---

## 9. Routing Modes

Implement these modes in order:

### Manual

Explicit model/provider selection.

### Priority

Select the first eligible healthy model.

### Cheapest

Select the lowest-cost eligible model.

### Fastest

Select the lowest-latency eligible model using recent measurements.

### Balanced

Use weighted scoring.

### Automatic

Classify the request and select an appropriate strategy/model.

Automatic routing is a later MVP milestone, not a prerequisite for the first gateway.

---

## 10. Request Classification

Eventually classify requests into:

```text
simple
coding
debugging
reasoning
research
summarization
creative
vision
long_context
tool_use
agent_planning
code_review
```

Initial classification should use deterministic heuristics and request metadata where possible.

Do not call an expensive LLM solely to classify every request unless measurements demonstrate that the tradeoff is worthwhile.

---

## 11. Fallback System

Each routing decision may contain:

```text
primary
fallback_1
fallback_2
```

Fallback triggers can include:

- Timeout.
- Provider unavailable.
- Rate limit.
- Temporary provider failure.
- Model unavailable.
- Invalid provider response.

Every request must have bounded retries/fallback attempts.

Never implement infinite retries.

Avoid retrying errors that are clearly non-transient.

---

## 12. Provider Health

Track:

```text
success_rate
failure_rate
average_latency
recent_failures
last_success
last_failure
health_state
```

Potential states:

```text
healthy
degraded
unhealthy
disabled
```

Repeated failures should reduce routing priority or temporarily activate a circuit breaker.

Health state must recover automatically after successful checks/requests.

---

## 13. Cost Tracking

Track when information is available:

```text
input_tokens
output_tokens
total_tokens
estimated_cost
provider
model
duration_ms
status
timestamp
```

Cost calculations must clearly distinguish:

- Provider-reported cost.
- Estimated cost.
- Unknown cost.

Never present an estimate as an exact provider charge.

---

## 14. Database

Use Neon PostgreSQL initially.

Core entities:

```text
users
projects
api_keys
providers
models
routing_policies
routing_rules
requests
request_attempts
model_metrics
provider_metrics
budgets
```

Do not store full prompts/responses by default.

If request content logging is added later, it must be explicitly opt-in.

---

## 15. API

Initial API:

```text
POST /v1/chat/completions
GET  /v1/models
GET  /health
```

The API should accept common OpenAI-compatible request fields and return compatible responses where practical.

Streaming must be supported.

The implementation should fail clearly when a requested feature is unsupported rather than silently changing request semantics.

---

## 16. Security

Required:

- API authentication.
- Secure provider secret storage.
- Per-key rate limiting.
- Input-size limits.
- Request timeouts.
- Retry/fallback limits.
- CORS restrictions.
- Environment-based secrets.
- Administrative audit logging.
- No provider secret exposure to browser clients.

API keys should be stored using appropriate hashing/encryption depending on whether the original secret ever needs to be recovered.

---

## 17. Dashboard

Initial dashboard sections:

### Overview

- Requests.
- Success rate.
- Average latency.
- Estimated cost.
- Active providers.

### Providers

- Provider.
- Status.
- Models.
- Latency.
- Success rate.

### Models

- Model.
- Provider.
- Capabilities.
- Context window.
- Price.
- Routing score.

### Routing

- Strategy.
- Model priorities.
- Fallbacks.
- Weights.
- Constraints.

### Requests

- Timestamp.
- Model.
- Provider.
- Tokens.
- Cost.
- Latency.
- Status.

Prompt/response contents should not appear by default.

---

## 18. Development Phases

### Phase 0 — Repository Audit

Before coding:

- Inspect existing repository.
- Read existing `AGENTS.md`.
- Identify current stack.
- Identify package manager.
- Identify existing application structure.
- Identify deployment configuration.
- Identify test infrastructure.
- Do not overwrite existing conventions without justification.

Stop if the repository state is unclear or contradictory.

### Phase 1 — Gateway

Deliver:

- API server.
- Authentication skeleton.
- `/health`.
- `/v1/models`.
- `/v1/chat/completions`.
- One provider.
- Streaming.
- Error normalization.

### Phase 2 — Provider Abstraction

Deliver:

- Common provider interface.
- Provider registry.
- Three providers.
- Model registry.
- Provider-specific adapters.

### Phase 3 — Routing

Deliver:

- Manual.
- Priority.
- Cheapest.
- Fastest.
- Balanced.

Add unit tests for deterministic routing.

### Phase 4 — Reliability

Deliver:

- Timeouts.
- Bounded retries.
- Fallbacks.
- Provider health.
- Circuit breaking.
- Failure normalization.

### Phase 5 — Telemetry

Deliver:

- Request metrics.
- Token tracking.
- Cost estimates.
- Latency measurements.
- Provider/model statistics.

### Phase 6 — Dashboard

Deliver:

- Overview.
- Providers.
- Models.
- Routing.
- Requests.

### Phase 7 — Automatic Routing

Deliver:

- Task classification.
- Capability matching.
- Automatic routing.
- Configurable scoring.

### Phase 8 — Agent-Aware Routing

Support metadata such as:

```json
{
  "agent": "coder",
  "task": "debugging",
  "language": "typescript",
  "requires_tools": true,
  "context_tokens": 18000,
  "priority": "normal",
  "budget": "low"
}
```

### Phase 9 — Learning

Only after sufficient telemetry exists:

- Historical performance analysis.
- Model/task performance correlations.
- Adaptive weights.
- Routing experiments.
- Offline routing simulation.

Do not introduce machine learning before there is enough trustworthy data to evaluate it.

---

## 19. Testing Strategy

Every phase must include tests.

### Unit

Test:

- Routing scores.
- Hard constraints.
- Provider selection.
- Fallback ordering.
- Cost calculations.
- Classification.
- Configuration validation.

### Integration

Test:

- API → router.
- Router → provider adapter.
- Database persistence.
- Provider failure.
- Fallback.
- Streaming.

### End-to-end

Test:

```text
Client
  ↓
Bifröst
  ↓
Provider
  ↓
Streaming response
```

Also test failure paths.

### Regression

Every discovered production bug must receive a regression test when practical.

---

## 20. Performance Requirements

The router itself should add minimal overhead.

Measure:

```text
routing decision latency
total gateway latency
provider latency
database latency
```

Do not perform unnecessary database queries on every token/chunk.

Streaming must not buffer an entire LLM response before returning it.

---

## 21. Deployment

Target:

```text
Frontend/API → Vercel
Database     → Neon
DNS/Edge     → Cloudflare
Inference    → External providers/Ollama
```

Environment variables must be documented.

No secret values may be committed.

Development should work without paid infrastructure where provider free tiers/local models permit.

---

## 22. Free-Tier Development Principle

Bifröst should be designed to minimize infrastructure cost.

The router itself does not require GPUs.

Development target:

```text
Vercel
Neon
Cloudflare
GitHub
Local Ollama
Provider free tiers
```

Free-tier limits must never be assumed to be permanent. Verify current limits before production deployment.

---

## 23. Definition of MVP Complete

The MVP is complete when a developer can configure an OpenAI-compatible client to use Bifröst and successfully:

1. Authenticate.
2. List available models.
3. Send a chat completion.
4. Receive a streamed response.
5. Route between multiple providers.
6. Trigger a controlled fallback.
7. View request/latency/token metrics.
8. Configure routing strategy.
9. Deploy the system to the target serverless stack.
10. Run the complete automated test suite.

---

## 24. Future Direction

Bifröst should evolve through:

```text
API Gateway
     ↓
LLM Gateway
     ↓
Intelligent Model Router
     ↓
Agent-Aware Router
     ↓
Adaptive AI Traffic Control Plane
```

Long-term optimization dimensions:

```text
quality
cost
latency
reliability
availability
context
capability
```

The core principle remains:

> Applications describe what they need. Bifröst determines where the request should go.
