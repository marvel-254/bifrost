/**
 * Bifröst Policy Engine — v1
 *
 * Executes hard constraints first (exclude/require), then soft scoring.
 * Each rule produces an explicit RuleResult so the router can explain itself.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface PolicyContext {
  provider: ProviderInfo;
  model: ModelInfo;
  request: RequestInfo;
  quota?: QuotaInfo;
  health?: HealthInfo;
}

export interface ProviderInfo {
  id: string;
  name: string;
  enabled: boolean;
  billingType: 'free' | 'trial' | 'paid';
  securityStatus?: 'ok' | 'compromised';
  region?: string;
  zeroDataRetention?: boolean;
  trainingOnData?: boolean;
  streaming?: boolean;
}

export interface ModelInfo {
  id: string;
  provider: string;
  contextWindow: number;
  capabilities: string[];
  inputPrice: number;
  outputPrice: number;
  enabled: boolean;
  quality?: number;
  codingScore?: number;
  reasoningScore?: number;
}

export interface RequestInfo {
  tools?: boolean;
  hasImages?: boolean;
  hasAudio?: boolean;
  structuredOutput?: boolean;
  inputTokens?: number;
  maxLatencyMs?: number;
  qualityFloor?: number;
  costMode?: 'free_preferred' | 'free_only' | 'cheap' | 'any';
  task?: 'chat' | 'coding' | 'reasoning' | 'research' | 'creative' | 'summarization';
  complexity?: 'low' | 'medium' | 'high';
  speedMode?: 'fast' | 'balanced' | 'quality';
  agentMode?: boolean;
  streaming?: boolean;
  privacy?: 'standard' | 'strict' | 'no_training';
  region?: string;
  budgetRemaining?: number;
  conversationId?: string;
  previousModel?: { provider: string; model: string };
  maxTokens?: number;
}

export interface QuotaInfo {
  available: boolean;
  remainingTokens: number;
  remainingPercent: number;
  resetMinutes: number;
}

export interface HealthInfo {
  healthy: boolean;
  latencyMs: number;
  successRate: number;
  circuitOpen: boolean;
}

export type RuleResult =
  | { type: 'exclude'; ruleId: string; reason: string }
  | { type: 'requirement'; ruleId: string; requirement: string }
  | { type: 'score'; ruleId: string; delta: number; reason: string }
  | { type: 'pass'; ruleId: string };

export interface ScoredCandidate {
  provider: string;
  model: string;
  finalScore: number;
  hardFiltered: boolean;
  filterReasons: string[];
  scoreBreakdown: Array<{ ruleId: string; delta: number; reason: string }>;
}

// ── Rule definitions ───────────────────────────────────────────────────────

export interface RoutingRule {
  id: string;
  name: string;
  category: string;
  evaluate(ctx: PolicyContext): RuleResult;
}

// ── v1 Rule set ────────────────────────────────────────────────────────────

const rules: RoutingRule[] = [
  // R001 — Block disabled provider
  { id: 'R001', name: 'provider-disabled', category: 'security', evaluate(ctx) {
    if (!ctx.provider.enabled) return { type: 'exclude', ruleId: 'R001', reason: `Provider "${ctx.provider.id}" is disabled` };
    return { type: 'pass', ruleId: 'R001' };
  }},

  // R002 — Block compromised provider
  { id: 'R002', name: 'provider-security-failure', category: 'security', evaluate(ctx) {
    if (ctx.provider.securityStatus === 'compromised') return { type: 'exclude', ruleId: 'R002', reason: `Provider "${ctx.provider.id}" is compromised` };
    return { type: 'pass', ruleId: 'R002' };
  }},

  // R010 — Strict privacy
  { id: 'R010', name: 'strict-privacy', category: 'privacy', evaluate(ctx) {
    if (ctx.request.privacy === 'strict' && !ctx.provider.zeroDataRetention) {
      return { type: 'exclude', ruleId: 'R010', reason: 'Strict privacy requires zero data retention' };
    }
    return { type: 'pass', ruleId: 'R010' };
  }},

  // R011 — No training
  { id: 'R011', name: 'no-training', category: 'privacy', evaluate(ctx) {
    if (ctx.request.privacy === 'no_training' && ctx.provider.trainingOnData === true) {
      return { type: 'exclude', ruleId: 'R011', reason: 'Provider trains on data, request requires no training' };
    }
    return { type: 'pass', ruleId: 'R011' };
  }},

  // R020 — Tool calling
  { id: 'R020', name: 'require-tool-calling', category: 'capability', evaluate(ctx) {
    if (ctx.request.tools && !ctx.model.capabilities.includes('tool_use')) {
      return { type: 'exclude', ruleId: 'R020', reason: 'Model does not support tool calling' };
    }
    return { type: 'pass', ruleId: 'R020' };
  }},

  // R021 — Vision
  { id: 'R021', name: 'require-vision', category: 'capability', evaluate(ctx) {
    if (ctx.request.hasImages && !ctx.model.capabilities.includes('vision')) {
      return { type: 'exclude', ruleId: 'R021', reason: 'Model does not support vision' };
    }
    return { type: 'pass', ruleId: 'R021' };
  }},

  // R030 — Context window
  { id: 'R030', name: 'context-window', category: 'context', evaluate(ctx) {
    const inputTokens = ctx.request.inputTokens ?? 0;
    if (inputTokens > 0 && ctx.model.contextWindow < inputTokens) {
      return { type: 'exclude', ruleId: 'R030', reason: `Model context ${ctx.model.contextWindow} < request ${inputTokens}` };
    }
    return { type: 'pass', ruleId: 'R030' };
  }},

  // R040 — Quality floor
  { id: 'R040', name: 'quality-floor', category: 'quality', evaluate(ctx) {
    if (ctx.request.qualityFloor != null && (ctx.model.quality ?? 0.5) < ctx.request.qualityFloor) {
      return { type: 'exclude', ruleId: 'R040', reason: `Model quality ${(ctx.model.quality ?? 0.5).toFixed(2)} < floor ${ctx.request.qualityFloor}` };
    }
    return { type: 'pass', ruleId: 'R040' };
  }},

  // R041 — Coding quality
  { id: 'R041', name: 'coding-quality', category: 'quality', evaluate(ctx) {
    if (ctx.request.task === 'coding' && ctx.model.codingScore != null && ctx.model.codingScore < 0.75) {
      return { type: 'exclude', ruleId: 'R041', reason: `Coding score ${ctx.model.codingScore} < 0.75` };
    }
    return { type: 'pass', ruleId: 'R041' };
  }},

  // R050 — Free preferred (soft)
  { id: 'R050', name: 'free-preferred', category: 'cost', evaluate(ctx) {
    if (ctx.request.costMode === 'free_preferred' && ctx.provider.billingType === 'free') {
      return { type: 'score', ruleId: 'R050', delta: 40, reason: 'Free provider preference' };
    }
    return { type: 'pass', ruleId: 'R050' };
  }},

  // R051 — Free only
  { id: 'R051', name: 'free-only', category: 'cost', evaluate(ctx) {
    if (ctx.request.costMode === 'free_only' && ctx.provider.billingType !== 'free') {
      return { type: 'exclude', ruleId: 'R051', reason: `Provider billing type "${ctx.provider.billingType}" != free` };
    }
    return { type: 'pass', ruleId: 'R051' };
  }},

  // R060 — Quota exhausted
  { id: 'R060', name: 'quota-exhausted', category: 'quota', evaluate(ctx) {
    if (ctx.quota && !ctx.quota.available) {
      return { type: 'exclude', ruleId: 'R060', reason: 'Provider quota exhausted' };
    }
    return { type: 'pass', ruleId: 'R060' };
  }},

  // R061 — Preserve scarce quota
  { id: 'R061', name: 'preserve-scarce-quota', category: 'quota', evaluate(ctx) {
    if (ctx.quota && ctx.quota.remainingPercent < 20 && ctx.quota.resetMinutes > 60) {
      return { type: 'score', ruleId: 'R061', delta: -25, reason: `Quota low (${ctx.quota.remainingPercent}%) with long reset (${ctx.quota.resetMinutes}m)` };
    }
    return { type: 'pass', ruleId: 'R061' };
  }},

  // R063 — Consume expiring quota
  { id: 'R063', name: 'consume-expiring-quota', category: 'quota', evaluate(ctx) {
    if (ctx.quota && ctx.provider.billingType === 'free' && ctx.quota.remainingPercent > 20 && ctx.quota.resetMinutes < 30) {
      return { type: 'score', ruleId: 'R063', delta: 30, reason: 'Quota expiring soon, use it' };
    }
    return { type: 'pass', ruleId: 'R063' };
  }},

  // R080 — Latency limit
  { id: 'R080', name: 'latency-limit', category: 'latency', evaluate(ctx) {
    if (ctx.request.maxLatencyMs != null && ctx.health && ctx.health.latencyMs > ctx.request.maxLatencyMs) {
      return { type: 'exclude', ruleId: 'R080', reason: `Provider latency ${ctx.health.latencyMs}ms > limit ${ctx.request.maxLatencyMs}ms` };
    }
    return { type: 'pass', ruleId: 'R080' };
  }},

  // R090 — Reliability floor
  { id: 'R090', name: 'reliability-floor', category: 'reliability', evaluate(ctx) {
    if (ctx.health && ctx.health.successRate < 0.98) {
      return { type: 'exclude', ruleId: 'R090', reason: `Success rate ${(ctx.health.successRate * 100).toFixed(1)}% < 98%` };
    }
    return { type: 'pass', ruleId: 'R090' };
  }},

  // R100 — Circuit breaker
  { id: 'R100', name: 'circuit-open', category: 'reliability', evaluate(ctx) {
    if (ctx.health?.circuitOpen) {
      return { type: 'exclude', ruleId: 'R100', reason: 'Circuit breaker is open' };
    }
    return { type: 'pass', ruleId: 'R100' };
  }},

  // R120 — Agent mode
  { id: 'R120', name: 'agent-mode', category: 'task', evaluate(ctx) {
    if (ctx.request.agentMode) {
      if (!ctx.model.capabilities.includes('tool_use')) {
        return { type: 'exclude', ruleId: 'R120', reason: 'Agent mode requires tool calling' };
      }
      if (ctx.health && ctx.health.successRate < 0.995) {
        return { type: 'exclude', ruleId: 'R120', reason: 'Agent mode requires 99.5%+ reliability' };
      }
    }
    return { type: 'pass', ruleId: 'R120' };
  }},

  // R130 — Streaming
  { id: 'R130', name: 'streaming', category: 'capability', evaluate(ctx) {
    if (ctx.request.streaming && ctx.provider.streaming === false) {
      return { type: 'exclude', ruleId: 'R130', reason: 'Provider does not support streaming' };
    }
    return { type: 'pass', ruleId: 'R130' };
  }},
];

// ── Scoring weights per strategy ───────────────────────────────────────────

export interface StrategyWeights {
  quality: number;
  cost: number;
  reliability: number;
  latency: number;
  quota: number;
  consistency: number;
}

export const STRATEGY_WEIGHTS: Record<string, StrategyWeights> = {
  balanced:       { quality: 0.25, cost: 0.15, reliability: 0.20, latency: 0.10, quota: 0.25, consistency: 0.05 },
  'free-first':   { quality: 0.15, cost: 0.30, reliability: 0.10, latency: 0.05, quota: 0.40, consistency: 0.00 },
  'free-only':    { quality: 0.10, cost: 0.40, reliability: 0.10, latency: 0.05, quota: 0.35, consistency: 0.00 },
  cheapest:       { quality: 0.05, cost: 0.50, reliability: 0.10, latency: 0.05, quota: 0.30, consistency: 0.00 },
  fastest:        { quality: 0.10, cost: 0.05, reliability: 0.20, latency: 0.60, quota: 0.05, consistency: 0.00 },
  'highest-quality': { quality: 0.50, cost: 0.05, reliability: 0.20, latency: 0.10, quota: 0.15, consistency: 0.00 },
  'most-reliable': { quality: 0.15, cost: 0.05, reliability: 0.50, latency: 0.15, quota: 0.15, consistency: 0.00 },
};

// ── Engine ─────────────────────────────────────────────────────────────────

export class PolicyEngine {
  private rules: RoutingRule[];

  constructor(customRules?: RoutingRule[]) {
    this.rules = customRules || [...rules];
  }

  static getWeights(mode: string): StrategyWeights {
    return STRATEGY_WEIGHTS[mode] || STRATEGY_WEIGHTS.balanced;
  }

  static getAvailableModes(): string[] {
    return Object.keys(STRATEGY_WEIGHTS);
  }

  /**
   * Evaluate all candidates. Returns scored + filtered list sorted by finalScore desc.
   */
  evaluate(candidates: PolicyContext[], strategy: string = 'balanced'): ScoredCandidate[] {
    const weights = STRATEGY_WEIGHTS[strategy] || STRATEGY_WEIGHTS.balanced;
    const results: ScoredCandidate[] = [];

    for (const ctx of candidates) {
      const filterReasons: string[] = [];
      const scoreBreakdown: Array<{ ruleId: string; delta: number; reason: string }> = [];
      let hardFiltered = false;

      // Phase 1: Hard constraints
      for (const rule of this.rules) {
        const result = rule.evaluate(ctx);
        if (result.type === 'exclude') {
          filterReasons.push(result.reason);
          hardFiltered = true;
          break; // no need to evaluate further
        }
      }

      if (hardFiltered) {
        results.push({
          provider: ctx.provider.id,
          model: ctx.model.id,
          finalScore: 0,
          hardFiltered: true,
          filterReasons,
          scoreBreakdown: [],
        });
        continue;
      }

      // Phase 2: Soft scoring
      let softScore = 0;
      for (const rule of this.rules) {
        const result = rule.evaluate(ctx);
        if (result.type === 'score') {
          softScore += result.delta;
          scoreBreakdown.push({ ruleId: result.ruleId, delta: result.delta, reason: result.reason });
        }
      }

      // Base scoring
      const quality = ctx.model.quality ?? 0.5;
      const costScore = ctx.model.inputPrice + ctx.model.outputPrice === 0 ? 1.0 : 1 / (1 + ctx.model.inputPrice + ctx.model.outputPrice);
      const reliabilityScore = ctx.health?.successRate ?? 0.95;
      const latencyScore = ctx.health ? 1 / (1 + ctx.health.latencyMs / 1000) : 0.5;
      const quotaScore = ctx.quota ? ctx.quota.remainingPercent / 100 : 0.5;

      const baseScore =
        weights.quality * quality * 100 +
        weights.cost * costScore * 100 +
        weights.reliability * reliabilityScore * 100 +
        weights.latency * latencyScore * 100 +
        weights.quota * quotaScore * 100;

      // Consistency bonus
      let consistencyBonus = 0;
      if (ctx.request.conversationId && ctx.request.previousModel) {
        if (ctx.request.previousModel.provider === ctx.provider.id && ctx.request.previousModel.model === ctx.model.id) {
          consistencyBonus = weights.consistency * 100;
        }
      }

      const finalScore = Math.round((baseScore + consistencyBonus + softScore) * 100) / 100;

      results.push({
        provider: ctx.provider.id,
        model: ctx.model.id,
        finalScore,
        hardFiltered: false,
        filterReasons: [],
        scoreBreakdown,
      });
    }

    // Sort by score descending, filtered candidates last
    results.sort((a, b) => {
      if (a.hardFiltered && !b.hardFiltered) return 1;
      if (!a.hardFiltered && b.hardFiltered) return -1;
      return b.finalScore - a.finalScore;
    });

    return results;
  }

  /**
   * Explain why a specific candidate was selected or rejected.
   */
  explain(ctx: PolicyContext): RuleResult[] {
    return this.rules.map(rule => rule.evaluate(ctx));
  }
}
