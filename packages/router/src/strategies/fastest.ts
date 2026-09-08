/**
 * Fastest routing strategy.
 *
 * Selects the lowest-latency eligible model using recent measurements.
 * Uses provider_health.latency_ms when available, falls back to context window
 * as a rough proxy (larger context = generally slower).
 */
import { RoutingStrategy, RoutingResult, StrategyInput, Candidate } from '../engine';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry } from '@bifrost/providers';

export class FastestStrategy implements RoutingStrategy {
  readonly name = 'fastest';

  constructor(
    private models: ModelRegistry,
    private providers: ProviderRegistry,
    private latencyMap?: Map<string, number> // provider::model -> latency_ms
  ) {}

  async route(input: StrategyInput): Promise<RoutingResult> {
    const { capabilities, previousAttempts } = input;
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

      const key = `${m.provider}::${m.id}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const latencyMs = this.latencyMap?.get(key) ?? 0;

      // Invert latency for scoring: faster = higher score
      // 0ms latency => 1.0, 1000ms => ~0.5, 5000ms => ~0.17
      const latencyScore = 1 / (1 + latencyMs / 1000);

      candidates.push({
        provider: m.provider,
        model: m.id,
        score: latencyScore,
        reason: `latency=${latencyMs}ms`,
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
      metadata: { strategy: 'fastest', reason: 'lowest latency' },
    };
  }
}
