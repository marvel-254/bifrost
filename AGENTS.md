# Bifröst — AGENTS.md

## 1. Mission

You are an engineering agent working on Bifröst, a lightweight OpenAI-compatible AI gateway and intelligent model router.

Your job is to implement the project incrementally according `PLAN.md`.

The priority order is:

1. Correctness.
2. Security.
3. Reliability.
4. Compatibility.
5. Testability.
6. Performance.
7. Simplicity.

Do not optimize for feature count.

---

## 2. Source of Truth

Before modifying the project:

1. Read `PLAN.md`.
2. Read this `AGENTS.md`.
3. Inspect the repository.
4. Read any existing project documentation.
5. Inspect the current package manager and scripts.
6. Inspect the existing test setup.
7. Inspect deployment configuration.
8. Preserve existing working conventions unless there is a documented reason to change them.

If `PLAN.md` conflicts with an existing repository constraint, stop and report the conflict before making a destructive architectural change.

---

## 3. Execution Rules

Agents must:

- Work in the requested repository only.
- Confirm the active branch before making changes.
- Never assume the repository or branch.
- Never delete unrelated work.
- Never reset or force-push a branch unless explicitly authorized.
- Never overwrite user changes without authorization.
- Make small, logically isolated changes.
- Run relevant tests after changes.
- Run formatting/lint/type checks where configured.
- Update documentation when behavior or architecture changes.
- Keep secrets out of source control.
- Prefer existing dependencies over adding new ones.
- Prefer simple implementations over premature abstractions.

If a requested change requires a major architectural decision not covered by `PLAN.md`, explain the decision and obtain confirmation before implementing it.

---

## 4. Stop Conditions

Stop implementation and report the blocker when:

- The repository cannot be identified confidently.
- The requested branch cannot be identified.
- Existing uncommitted work would be overwritten.
- Required credentials/secrets are unavailable.
- A provider API requirement is unclear.
- A destructive database migration is required without authorization.
- The existing architecture conflicts materially with the requested implementation.
- Tests reveal an unrelated pre-existing failure that prevents reliable validation.
- A security-sensitive implementation cannot be validated safely.
- A change would require paid infrastructure when the task explicitly targets free infrastructure.

Do not silently work around a stop condition.

---

## 5. Branch Rules

Before work:

```text
git status
git branch --show-current
git remote -v
```

Do not assume the default branch is `main`.

Use the branch supplied by the user or repository workflow.

If no branch is supplied, inspect the repository's established workflow before creating one.

Never force-push.

Never rewrite shared history.

---

## 6. Repository Safety

Never run destructive commands such as:

```text
git reset --hard
git clean -fd
git checkout -- .
git push --force
```

unless the user explicitly authorizes the exact operation.

Do not delete migrations, environment files, tests, configuration, or existing application code merely to simplify implementation.

---

## 7. Architecture Rules

Bifröst has a strict separation of responsibilities.

### API Layer

Responsible for:

- HTTP.
- Authentication.
- Validation.
- OpenAI-compatible request/response handling.
- Streaming.

It must not contain complex routing logic.

### Routing Layer

Responsible for:

- Candidate selection.
- Capability matching.
- Scoring.
- Routing strategy.
- Budget constraints.
- Provider health signals.

It must not contain provider-specific HTTP implementation.

### Provider Layer

Responsible for:

- Provider authentication.
- Request translation.
- Provider API calls.
- Streaming translation.
- Provider error normalization.
- Provider health checks.
- Provider cost metadata.

### Persistence Layer

Responsible for:

- Database access.
- Models.
- Routing configuration.
- Metrics.
- Request metadata.

Do not scatter raw database queries throughout unrelated application code.

---

## 8. Provider Adapter Rule

All providers must implement a common interface.

Adding a provider should not require rewriting the routing engine.

Do not add:

```text
if provider == "gemini"
if provider == "groq"
if provider == "anthropic"
```

throughout the application.

Provider-specific behavior belongs in the provider adapter.

---

## 9. Routing Rules

Routing has two levels:

### Hard constraints

Apply first.

Examples:

- Capability unavailable.
- Context too small.
- Provider disabled.
- Model disabled.
- Budget exceeded.
- User explicitly disallowed provider.

A model failing a hard constraint must never be selected.

### Soft scoring

Apply after filtering.

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

Do not hard-code weights in multiple locations.

---

## 10. Routing Determinism

Given the same:

- eligible models,
- routing configuration,
- health data,
- metrics,

the routing engine should produce the same decision.

Avoid hidden randomness.

If randomness is introduced later for experimentation, it must be explicit, configurable, and testable.

---

## 11. Fallback Rules

Fallbacks must be bounded.

Every request must have a maximum number of attempts.

Do not retry:

- indefinitely,
- obviously invalid requests,
- authentication failures caused by invalid credentials,
- malformed requests.

Retry transient failures where appropriate.

Record every attempt.

A final failure should contain enough normalized information for the client to understand what happened without exposing provider secrets.

---

## 12. Streaming Rules

Streaming is a first-class requirement.

Do not:

```text
provider → buffer complete response → client
```

when the provider supports streaming.

Prefer:

```text
provider stream → normalize chunks → client stream
```

Handle:

- connection termination,
- provider stream errors,
- client cancellation,
- timeout,
- partial responses.

Do not log complete streamed content by default.

---

## 13. Database Rules

Use PostgreSQL through the selected database layer.

The database should contain configuration and metadata, not unnecessary raw model conversations.

Default request logging should store:

```text
request id
project/user
provider
model
routing strategy
tokens
latency
status
estimated cost
timestamp
```

Do not store full prompts/responses unless explicitly enabled.

Every schema change requires an appropriate migration.

Never manually modify production schema as a substitute for migrations.

---

## 14. Security Rules

Never commit:

- API keys.
- Provider secrets.
- Database passwords.
- JWT secrets.
- Production credentials.
- `.env` files containing secrets.

Use environment variables or the deployment platform's secret management.

Provider credentials must never be sent to frontend code.

Validate all externally supplied data.

Apply reasonable:

- request size limits,
- timeout limits,
- rate limits,
- retry limits.

Do not trust client-supplied cost, token, provider, or health information.

---

## 15. API Compatibility

Bifröst exposes an OpenAI-compatible interface.

Compatibility should be implemented deliberately.

Do not claim compatibility for fields/features that are not actually supported.

If a provider does not support a requested feature:

1. Determine whether Bifröst can safely translate it.
2. Otherwise return a clear unsupported-feature error.
3. Do not silently discard important request semantics.

---

## 16. Error Handling

Use normalized Bifröst errors internally.

Distinguish:

```text
client error
authentication error
validation error
provider error
rate limit
timeout
routing failure
configuration error
internal error
```

Never leak:

- provider API keys,
- internal stack traces,
- database credentials,
- private infrastructure details.

Provider errors may be recorded internally in sanitized form.

---

## 17. Observability

Record enough metadata to answer:

- Which provider handled the request?
- Which model handled it?
- How long did it take?
- Did fallback occur?
- How many attempts occurred?
- How many tokens were used?
- What was the estimated cost?
- Did the request succeed?

Do not create excessive logging that increases cost or leaks user data.

---

## 18. Performance Rules

Avoid unnecessary database calls in the request hot path.

Do not query the database once per streamed token.

Prefer:

```text
load routing/configuration
→ route
→ call provider
→ stream
→ record aggregate metrics
```

Use caching only when there is a demonstrated performance reason.

Do not introduce Redis solely because other AI gateways use it.

---

## 19. Testing Rules

Every feature must include appropriate tests.

### Required

- Unit tests for routing.
- Unit tests for validation.
- Provider adapter tests.
- Fallback tests.
- API tests.
- Database integration tests where relevant.
- Streaming tests.
- End-to-end tests for critical flows.

Every bug that can be reproduced should receive a regression test.

Tests must not depend on real paid provider calls unless explicitly configured as an integration test.

Use mocked provider responses for deterministic CI tests.

---

## 20. Provider Testing

Provider integration tests must cover:

- Normal completion.
- Streaming.
- Authentication failure.
- Rate limit.
- Timeout.
- Provider unavailable.
- Malformed provider response.
- Client cancellation where practical.

Provider API behavior can change.

Keep provider-specific assumptions isolated so they can be updated without affecting the router.

---

## 21. Agent-Aware Metadata

When supported, accept metadata such as:

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

Treat client metadata as hints unless validated.

Never allow arbitrary client metadata to bypass security, budget, provider restrictions, or hard routing constraints.

---

## 22. Cost Rules

Always distinguish:

```text
exact provider-reported cost
estimated cost
unknown cost
```

Never display an estimated cost as an exact bill.

Provider pricing belongs in provider/model metadata, not duplicated throughout the codebase.

Pricing updates should be easy to change.

---

## 23. Free Infrastructure Principle

The initial architecture targets:

```text
Vercel
Neon
Cloudflare
GitHub
Local Ollama
Provider free tiers
```

Do not introduce paid infrastructure without a concrete requirement.

If a feature cannot be implemented reliably within the free-tier architecture, document the limitation rather than disguising it.

---

## 24. Dependency Rules

Before adding a dependency:

1. Check whether the project already has equivalent functionality.
2. Check whether the dependency is necessary.
3. Prefer mature, lightweight dependencies.
4. Avoid adding dependencies for trivial functionality.
5. Update lockfiles correctly.
6. Run tests after installation.

Do not add a large framework to solve a small problem.

---

## 25. Frontend Rules

The dashboard should be:

- Simple.
- Responsive.
- Fast.
- Accessible.
- Functional before decorative.

Do not build a complex visual dashboard before the underlying API and metrics are correct.

Never expose provider credentials in frontend code.

---

## 26. Documentation Rules

Update documentation when:

- An API changes.
- A provider is added.
- Configuration changes.
- Deployment changes.
- Routing behavior changes.
- Database schema changes.
- A new environment variable is required.

At minimum document:

```text
installation
development
environment variables
provider setup
API usage
routing configuration
deployment
testing
troubleshooting
```

---

## 27. Implementation Workflow

For every task:

### Step 1 — Inspect

Understand the current implementation.

### Step 2 — Plan

Identify the smallest safe change.

### Step 3 — Implement

Make the change without unrelated refactoring.

### Step 4 — Test

Run targeted tests first.

### Step 5 — Validate

Run type checking/lint/build as appropriate.

### Step 6 — Review

Inspect the diff for:

- accidental changes,
- secrets,
- dead code,
- unnecessary dependencies,
- compatibility problems.

### Step 7 — Document

Update documentation where required.

### Step 8 — Report

Provide:

- what changed,
- files affected,
- tests run,
- known limitations,
- next recommended step.

---

## 28. Definition of Done

A task is not complete merely because the code compiles.

A task is complete when:

- The requested behavior exists.
- Existing behavior remains intact.
- Relevant tests pass.
- Types pass.
- Lint/format checks pass where configured.
- No secrets were introduced.
- Error paths are handled.
- Documentation is updated where necessary.
- The diff contains no unrelated changes.

---

## 29. Final Engineering Principle

Bifröst should remain small.

Prefer:

```text
simple architecture
+ clear interfaces
+ strong tests
+ measurable behavior
```

over:

```text
large architecture
+ speculative abstractions
+ unnecessary infrastructure
+ premature AI
```

The project should earn complexity through real requirements.

Do not build the future architecture before the current version needs it.
