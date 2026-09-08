export { ModelRegistry } from '@bifrost/models';
export type { Model, ModelConfig } from '@bifrost/models';

export { ProviderRegistry, createDefaultRegistry } from '@bifrost/providers';
export type { IProvider, ProviderRegistryConfig } from '@bifrost/providers';

// ── Legacy v1 engine types (kept for backward compatibility) ─────────────────

export type { RoutingResult, Candidate, StrategyInput, RoutingRule, RoutingWeights, RotationState } from './engine';
export type { RoutingStrategy as LegacyRoutingStrategy } from './engine';
export { DEFAULT_WEIGHTS, createRotationState, advanceRotation } from './engine';

// ── Phase 3 routing types ─────────────────────────────────────────────────────

export type { RoutingMode, StrategyWeights, HardConstraints, RoutingStrategy, ProviderInfo, ProviderHealthInfo, RoutingCandidate, ScoredCandidate, RoutingScores, RoutingDecision } from './types';
export { DEFAULT_STRATEGY_WEIGHTS, DEFAULT_HARD_CONSTRAINTS, DEFAULT_ROUTING_STRATEGY } from './types';

// ── Constraints ──────────────────────────────────────────────────────────────

export { filterCandidates, type FilterResult } from './constraints';

// ── Scoring ──────────────────────────────────────────────────────────────────

export { scoreCandidate } from './scoring';

// ── Candidate builder ────────────────────────────────────────────────────────

export { buildCandidates, type CandidateBuildOptions } from './candidates';

// ── Strategy selectors ───────────────────────────────────────────────────────

export { selectManual, selectPriority, selectCheapest, selectFastest, selectBalanced, selectAuto, type StrategyResult } from './strategies';

// ── Router core ──────────────────────────────────────────────────────────────

export { route } from './router';

// ── Policy engine (legacy v1) ────────────────────────────────────────────────

export { PolicyEngine, STRATEGY_WEIGHTS } from './policy-engine';
export type { PolicyContext, ProviderInfo as PolicyProviderInfo, ModelInfo, RequestInfo, QuotaInfo, HealthInfo, RuleResult, StrategyWeights as LegacyStrategyWeights } from './policy-engine';
