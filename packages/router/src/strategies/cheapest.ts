/**
 * Cheapest routing strategy.
 *
 * Selects the lowest-cost eligible model.
 * Uses inputPrice + outputPrice from the model registry.
 */
import { RoutingStrategy, RoutingResult, StrategyInput, Candidate } from '../engine';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry } from '@bifrost/providers';

export class CheapestStrategy implements RoutingStrategy {
  readonly name = 'cheapest';

  constructor(
    private models: ModelRegistry,
    private providers: ProviderRegistry
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

      // Cost = input + output per 1K tokens (lower = cheaper)
      const inputCost = (m.inputPrice ?? 0);
      const outputCost = (m.outputPrice ?? 0);
      const totalCost = inputCost + outputCost;

      // Invert cost for scoring: cheaper = higher score
      // Use 1 / (1 + cost) so free models score 1.0
      const costScore = 1 / (1 + totalCost);

      candidates.push({
        provider: m.provider,
        model: m.id,
        score: costScore,
        reason: `cost=$${totalCost.toFixed(4)}/1K`,
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
      metadata: { strategy: 'cheapest', reason: 'lowest cost' },
    };
  }
}
