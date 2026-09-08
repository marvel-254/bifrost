import type { Model } from '@bifrost/models';
import type { NormalizedRequest } from '@bifrost/shared';

// ── Routing mode ─────────────────────────────────────────────────────────────

export type RoutingMode = 'manual' | 'priority' | 'cheapest' | 'fastest' | 'balanced' | 'auto';

// ── Weights ──────────────────────────────────────────────────────────────────

export interface StrategyWeights {
  capabilityMatch: number;
  quality: number;
  reliability: number;
  costEfficiency: number;
  latency: number;
  availability: number;
}

export const DEFAULT_STRATEGY_WEIGHTS: StrategyWeights = {
  capabilityMatch: 0.30,
  quality: 0.25,
  reliability: 0.15,
  costEfficiency: 0.15,
  latency: 0.10,
  availability: 0.05,
};

// ── Hard constraints ─────────────────────────────────────────────────────────

export interface HardConstraints {
  requiredCapabilities: string[];
  minContextWindow: number;
  disabledProviders: string[];
  disabledModels: string[];
  budget?: number;
  userRestrictions: string[];
}

export const DEFAULT_HARD_CONSTRAINTS: HardConstraints = {
  requiredCapabilities: [],
  minContextWindow: 0,
  disabledProviders: [],
  disabledModels: [],
  budget: undefined,
  userRestrictions: [],
};

// ── Routing strategy config ──────────────────────────────────────────────────

export interface RoutingStrategy {
  mode: RoutingMode;
  weights: StrategyWeights;
  hardConstraints: HardConstraints;
}

export const DEFAULT_ROUTING_STRATEGY: RoutingStrategy = {
  mode: 'balanced',
  weights: DEFAULT_STRATEGY_WEIGHTS,
  hardConstraints: DEFAULT_HARD_CONSTRAINTS,
};

// ── Provider info (routing-layer view) ───────────────────────────────────────

export interface ProviderHealthInfo {
  healthy: boolean;
  latencyMs: number;
  successRate: number;
}

export interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
  health?: ProviderHealthInfo;
}

// ── Routing candidate ────────────────────────────────────────────────────────

export interface RoutingCandidate {
  model: Model;
  provider: ProviderInfo;
  capabilities: string[];
  qualityScore: number;
  costScore: number;
  latencyScore: number;
  reliabilityScore: number;
  availabilityScore: number;
  priority: number;
}

// ── Score breakdown ──────────────────────────────────────────────────────────

export interface RoutingScores {
  capabilityMatch: number;
  quality: number;
  reliability: number;
  costEfficiency: number;
  latency: number;
  availability: number;
  total: number;
}

// ── Scored candidate ──────────────────────────────────────────────────────────

export interface ScoredCandidate {
  candidate: RoutingCandidate;
  scores: RoutingScores;
}

// ── Routing decision ─────────────────────────────────────────────────────────

export interface StrategyResult {
  primary: RoutingCandidate | null;
  fallbacks: RoutingCandidate[];
}

export interface RoutingDecision {
  primary: RoutingCandidate | null;
  fallbacks: RoutingCandidate[];
  strategy: RoutingStrategy;
  reasoning: string;
  scores: RoutingScores | null;
}
