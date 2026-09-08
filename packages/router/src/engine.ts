import { Model } from '@bifrost/models';
import { IProvider } from '@bifrost/providers';

// ── Strategy interface ──────────────────────────────────────────────────────

export interface RoutingResult {
  selected: { provider: string; model: string } | null;
  error?: string | null;
  candidates: Candidate[];
  metadata?: Record<string, unknown>;
}

export interface Candidate {
  provider: string;
  model: string;
  score: number;
  reason?: string;
}

export interface StrategyInput {
  messages: unknown[];
  provider?: string;
  model?: string;
  capabilities?: string[];
  maxTokens?: number;
  temperature?: number;
  user?: string;
  project?: string;
  previousAttempts?: Array<{ provider: string; model: string; error: string }>;
  budget?: number;
  routingRule?: RoutingRule;
}

export interface RoutingRule {
  id: string;
  name: string;
  strategy: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface RoutingStrategy {
  name: string;
  route(input: StrategyInput): Promise<RoutingResult>;
}

// ── Weight model ────────────────────────────────────────────────────────────

export interface RoutingWeights {
  capabilityMatch: number;
  quality: number;
  reliability: number;
  costEfficiency: number;
  latency: number;
  availability: number;
}

export const DEFAULT_WEIGHTS: RoutingWeights = {
  capabilityMatch: 0.30,
  quality: 0.25,
  reliability: 0.15,
  costEfficiency: 0.15,
  latency: 0.10,
  availability: 0.05,
};

// ── Rotation state ──────────────────────────────────────────────────────────

export interface RotationState {
  /** Ordered list of (provider, model) pairs in rotation */
  order: Array<{ provider: string; model: string }>;
  /** Index of the next candidate to try */
  nextIndex: number;
}

export function createRotationState(models: Array<{ provider: string; model: string }>): RotationState {
  return {
    order: models,
    nextIndex: 0,
  };
}

export function advanceRotation(state: RotationState): { provider: string; model: string } | null {
  if (state.order.length === 0) return null;
  const candidate = state.order[state.nextIndex];
  state.nextIndex = (state.nextIndex + 1) % state.order.length;
  return candidate;
}
