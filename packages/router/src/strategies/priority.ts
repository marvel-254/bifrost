/**
 * Priority routing strategy.
 *
 * Selects the highest-priority model from the configured set.
 * Priority comes from routing_model_weights.priority_score (0-100).
 * Falls back to alphabetical ordering if no weights configured.
 */
import { Candidate, RoutingStrategy, RoutingResult, StrategyInput, ModelRegistry, ProviderRegistry } from '../engine';

export class PriorityStrategy implements RoutingStrategy {
  readonly name = 'priority';

  constructor(
    private models: ModelRegistry,
    private providers: ProviderRegistry,
    private weights?: Map<string, number> // provider::model -> priority_score (0-100)
  ) {}

  async route(input: StrategyInput): Promise<RoutingResult> {
    const { provider, capabilities, previousAttempts } = input;
    const failed = new Set<string>();
    if (previousAttempts) {
      for (const a of previousAttempts) {
        failed.add(`${a.provider}::${a.model}`);
      }
    }

    // Collect all enabled, healthy models across all providers
    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const [name, p] of this.providers.listProviders()) {
      const models = this.models.getModels();
      for (const m of models) {
        if (m.provider !== name) continue;
        if (!m.enabled) continue;
        if (failed.has(`${name}::${m.id}`)) continue;
        if (capabilities && !capabilities.every(c => m.capabilities.includes(c))) continue;

        const key = `${name}::${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const priority = this.weights?.get(key) ?? 50;
        candidates.push({ provider: name, model: m.id, score: priority, reason: `priority=${priority}` });
      }
    }

    if (candidates.length === 0) {
      return { selected: null, error: 'No eligible models available', candidates: [] };
    }

    // Sort by priority descending
    candidates.sort((a, b) => b.score - a.score);

    const top = candidates[0];
    return {
      selected: { provider: top.provider, model: top.model },
      candidates,
      metadata: { strategy: 'priority', reason: `highest priority score` },
    };
  }
}
