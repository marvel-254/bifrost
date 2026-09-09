import type { Policy, NormalizedRequest, PolicyContext, SimulationResult, CompressionLevel, NormalizedMessage } from './types';
import { PolicyEngine } from './policy-engine';
import { PolicyRegistry } from './policy-registry';

export interface SimulatorOptions {
  baselinePolicy?: Policy;
}

export class PolicySimulator {
  private engine: PolicyEngine;

  constructor(options: SimulatorOptions = {}) {
    const registry = new PolicyRegistry();
    if (options.baselinePolicy) {
      registry.registerPolicy(options.baselinePolicy);
    }
    this.engine = new PolicyEngine({ registry });
  }

  simulatePolicy(policy: Policy, historicalRequests: NormalizedRequest[]): SimulationResult {
    const registry = new (require('./policy-registry').PolicyRegistry)();
    registry.registerPolicy(policy);
    const simEngine = new PolicyEngine({ registry });

    const results: SimulationResult = {
      policy_name: policy.name,
      estimated_cost: 0,
      estimated_latency_ms: 0,
      provider_distribution: {},
      fallback_frequency: 0,
      failure_rate: 0,
      token_consumption: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      compression_savings: 0,
      quality_estimate: 0,
      request_count: historicalRequests.length,
      warnings: [],
    };

    if (historicalRequests.length === 0) {
      results.warnings.push('No historical requests provided for simulation');
      return results;
    }

    let fallbacks = 0;
    let failures = 0;
    const qualityScores: number[] = [];

    for (const req of historicalRequests) {
      const ctx: PolicyContext = {
        tenantId: (req.metadata?.tenant as string) || 'default',
        application: (req.metadata?.application as string),
        tags: (req.metadata?.tags as string[]) || [],
        request: req,
      };

      const decision = simEngine.evaluatePolicy(req, ctx);
      const promptTokens = estimatePromptTokens(req);
      const completionTokens = estimateCompletionTokens(req);
      const totalTokens = promptTokens + completionTokens;

      const cost = this.estimateRequestCost(decision, promptTokens, completionTokens);
      const latency = this.estimateLatency(decision, req);
      const provider = this.selectSimulatedProvider(decision, req);
      const compressionRatio = this.estimateCompressionRatio(decision.compressionLevel, req);
      const qualityScore = this.estimateQualityScore(decision, req);

      results.estimated_cost += cost;
      results.estimated_latency_ms += latency;
      results.token_consumption.prompt_tokens += promptTokens;
      results.token_consumption.completion_tokens += completionTokens;
      results.token_consumption.total_tokens += totalTokens;
      results.compression_savings += Math.max(0, totalTokens - Math.floor(totalTokens * compressionRatio));
      qualityScores.push(qualityScore);

      results.provider_distribution[provider] = (results.provider_distribution[provider] || 0) + 1;

      if (decision.fallbackStrategy === 'auto' || decision.fallbackStrategy === 'manual') {
        fallbacks++;
      }
      if (req.max_tokens && req.max_tokens < 100) {
        failures++;
      }
    }

    results.estimated_cost = Math.round(results.estimated_cost * 100) / 100;
    results.estimated_latency_ms = Math.round(results.estimated_latency_ms / historicalRequests.length);
    results.fallback_frequency = Math.round((fallbacks / historicalRequests.length) * 1000) / 10;
    results.failure_rate = Math.round((failures / historicalRequests.length) * 1000) / 10;
    results.quality_estimate = qualityScores.length > 0
      ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 100) / 100
      : 0;

    if (results.estimated_cost > 1000) {
      results.warnings.push('High estimated cost — review cost limits');
    }
    if (results.fallback_frequency > 30) {
      results.warnings.push('High fallback frequency — review provider availability');
    }
    if (results.failure_rate > 10) {
      results.warnings.push('High failure rate — review constraints');
    }

    return results;
  }

  compareWithBaseline(
    proposed: Policy,
    historicalRequests: NormalizedRequest[],
    current?: Policy
  ): SimulationResult & { comparison: NonNullable<SimulationResult['comparison']> } {
    const proposedResult = this.simulatePolicy(proposed, historicalRequests);

    if (!current) {
      return {
        ...proposedResult,
        comparison: {
          current_cost: proposedResult.estimated_cost,
          proposed_cost: proposedResult.estimated_cost,
          cost_delta_percent: 0,
          current_latency_ms: proposedResult.estimated_latency_ms,
          proposed_latency_ms: proposedResult.estimated_latency_ms,
          latency_delta_percent: 0,
        },
      };
    }

    const currentResult = this.simulatePolicy(current, historicalRequests);

    const costDelta = currentResult.estimated_cost > 0
      ? ((proposedResult.estimated_cost - currentResult.estimated_cost) / currentResult.estimated_cost) * 100
      : 0;
    const latencyDelta = currentResult.estimated_latency_ms > 0
      ? ((proposedResult.estimated_latency_ms - currentResult.estimated_latency_ms) / currentResult.estimated_latency_ms) * 100
      : 0;

    return {
      ...proposedResult,
      comparison: {
        current_cost: Math.round(currentResult.estimated_cost * 100) / 100,
        proposed_cost: Math.round(proposedResult.estimated_cost * 100) / 100,
        cost_delta_percent: Math.round(costDelta * 100) / 100,
        current_latency_ms: currentResult.estimated_latency_ms,
        proposed_latency_ms: proposedResult.estimated_latency_ms,
        latency_delta_percent: Math.round(latencyDelta * 100) / 100,
      },
    };
  }

  private estimateRequestCost(decision: import('./types').PolicyDecision, promptTokens: number, completionTokens: number): number {
    const baseCostPerToken = 0.00001;
    const costMultiplier = decision.costPreference === 'low' ? 0.5 : decision.costPreference === 'high' ? 2.0 : 1.0;
    return (promptTokens + completionTokens) * baseCostPerToken * costMultiplier;
  }

  private estimateLatency(decision: import('./types').PolicyDecision, req: NormalizedRequest): number {
    const baseLatency = req.stream ? 800 : 2000;
    const latencyMultiplier = decision.latencyPreference === 'low' ? 0.6 : decision.latencyPreference === 'high' ? 1.8 : 1.0;
    return Math.round(baseLatency * latencyMultiplier);
  }

  private selectSimulatedProvider(decision: import('./types').PolicyDecision, req: NormalizedRequest): string {
    if (decision.allowedProviders.length > 0) {
      const idx = Math.abs(hashCode(req.model + req.metadata?.tenant)) % decision.allowedProviders.length;
      return decision.allowedProviders[idx];
    }
    return 'simulated-provider';
  }

  private estimateCompressionRatio(level: CompressionLevel, req: NormalizedRequest): number {
    if (level === 'off') return 1.0;
    if (level === 'safe') return 0.92;
    if (level === 'balanced') return 0.85;
    if (level === 'aggressive') return 0.70;
    if (level === 'auto') {
      if (req.stream) return 0.95;
      if ((req.tools?.length || 0) > 0) return 0.90;
      return 0.85;
    }
    return 1.0;
  }

  private estimateQualityScore(decision: import('./types').PolicyDecision, req: NormalizedRequest): number {
    let score = 0.5;
    if (decision.qualityPreference === 'high') score += 0.3;
    else if (decision.qualityPreference === 'medium') score += 0.15;
    if (decision.cacheEnabled) score += 0.1;
    if (decision.requiredCapabilities.length > 0) score += 0.05;
    if (decision.matchedPolicy) score += 0.05;
    return Math.min(1.0, score);
  }
}

function estimatePromptTokens(req: NormalizedRequest): number {
  return req.messages.reduce((sum: number, m: NormalizedMessage) => sum + (m.content?.length || 0) / 4, 0);
}

function estimateCompletionTokens(req: NormalizedRequest): number {
  return (req.max_tokens || 1024) * 0.7;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

export const policySimulator = new PolicySimulator();
