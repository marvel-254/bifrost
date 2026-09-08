/**
 * Balanced routing strategy.
 *
 * Uses weighted scoring across quality, cost, reliability, latency, and quota.
 * Default weights match PLAN.md §8.
 */
import { RoutingStrategy, RoutingResult, StrategyInput, Candidate, RoutingWeights, DEFAULT_WEIGHTS } from '../engine';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry } from '@bifrost/providers';

export class BalancedStrategy implements RoutingStrategy {
  readonly name = 'balanced';

  constructor(
    private models: ModelRegistry,
    private providers: ProviderRegistry,
    private weights: RoutingWeights = DEFAULT_WEIGHTS,
    private latencyMap?: Map<string, number>,
    private successRateMap?: Map<string, number>,
  ) {}

  async route(input: StrategyInput): Promise<RoutingResult> {
    const { capabilities, previousAttempts, maxTokens } = input;
    const failed = new Set<string>();
    if (previousAttempts) {
      for (const a of previousAttempts) {
        failed.add(`${a.provider}::${a.model}`);
      }
    }

    const allModels = this.models.listModels();
    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const m of allModels) {
      if (!m.enabled) continue;
      if (failed.has(`${m.provider}::${m.id}`)) continue;
      if (capabilities && !capabilities.every(c => m.capabilities.includes(c))) continue;
      if (maxTokens && m.contextWindow < maxTokens) continue;

      const key = `${m.provider}::${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const quality = this.estimateQuality(m);
      const costEfficiency = this.estimateCostEfficiency(m);
      const reliability = this.successRateMap?.get(key) ?? 0.95;
      const latency = this.estimateLatency(key);
      const availability = 1.0; // if it's in the list, it's available

      const score =
        this.weights.capabilityMatch * quality +
        this.weights.quality * quality +
        this.weights.reliability * reliability +
        this.weights.costEfficiency * costEfficiency +
        this.weights.latency * latency +
        this.weights.availability * availability;

      candidates.push({
        provider: m.provider,
        model: m.id,
        score: Math.round(score * 100) / 100,
        reason: `q=${quality.toFixed(2)} c=${costEfficiency.toFixed(2)} r=${reliability.toFixed(2)} l=${latency.toFixed(2)}`,
      });
    }

    if (candidates.length === 0) {
      return { selected: null, error: 'No eligible models available', candidates: [] };
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];

    return {
      selected: { provider: top.provider, model: top.model },
      candidates,
      metadata: { strategy: 'balanced', weights: this.weights },
    };
  }

  private estimateQuality(m: { contextWindow: number; capabilities: string[]; inputPrice?: number; outputPrice?: number }): number {
    let q = 0.5;
    if (m.contextWindow >= 128000) q += 0.2;
    else if (m.contextWindow >= 32000) q += 0.1;
    if (m.capabilities.includes('tool_use')) q += 0.1;
    if (m.capabilities.includes('vision')) q += 0.05;
    const price = (m.inputPrice ?? 0) + (m.outputPrice ?? 0);
    if (price > 5) q += 0.15; // expensive = likely higher quality
    return Math.min(q, 1.0);
  }

  private estimateCostEfficiency(m: { inputPrice?: number; outputPrice?: number }): number {
    const cost = (m.inputPrice ?? 0) + (m.outputPrice ?? 0);
    return 1 / (1 + cost);
  }

  private estimateLatency(key: string): number {
    const ms = this.latencyMap?.get(key) ?? 500;
    return 1 / (1 + ms / 1000);
  }
}
