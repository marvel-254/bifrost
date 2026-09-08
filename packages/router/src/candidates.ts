import type { ModelRegistry } from '@bifrost/models';
import type { ProviderRegistry } from '@bifrost/providers';
import type { RoutingCandidate, ProviderInfo, ProviderHealthInfo } from './types';

export interface CandidateBuildOptions {
  includeDisabled?: boolean;
  latencyMap?: Map<string, number>;
  successRateMap?: Map<string, number>;
}

export function buildCandidates(
  models: ModelRegistry,
  providers: ProviderRegistry,
  options: CandidateBuildOptions = {}
): RoutingCandidate[] {
  const { includeDisabled = false, latencyMap, successRateMap } = options;
  const allModels = models.listModels();
  const candidates: RoutingCandidate[] = [];

  for (const model of allModels) {
    if (!includeDisabled && !model.enabled) continue;

    const provider = providers.getProvider(model.provider);
    const providerInfo: ProviderInfo = {
      id: model.provider,
      name: model.provider,
      enabled: provider !== undefined,
    };

    let health: ProviderHealthInfo | undefined;
    if (provider) {
      const latencyKey = `${model.provider}::${model.id}`;
      const latencyMs = latencyMap?.get(latencyKey) ?? 0;
      const successRate = successRateMap?.get(latencyKey) ?? 0.95;

      health = {
        healthy: successRate > 0.9 && latencyMs < 10000,
        latencyMs,
        successRate,
      };
    }

    candidates.push({
      model,
      provider: providerInfo,
      capabilities: model.capabilities,
      qualityScore: estimateQuality(model),
      costScore: estimateCostEfficiency(model),
      latencyScore: estimateLatencyScore(health?.latencyMs ?? 0),
      reliabilityScore: health?.successRate ?? 0.95,
      availabilityScore: provider !== undefined ? 1.0 : 0.0,
      priority: 50,
    });
  }

  return candidates;
}

function estimateQuality(model: { contextWindow: number; capabilities: string[]; inputPrice?: number; outputPrice?: number }): number {
  let q = 0.5;
  if (model.contextWindow >= 128000) q += 0.2;
  else if (model.contextWindow >= 32000) q += 0.1;
  if (model.capabilities.includes('tool_use')) q += 0.1;
  if (model.capabilities.includes('vision')) q += 0.05;
  const price = (model.inputPrice ?? 0) + (model.outputPrice ?? 0);
  if (price > 5) q += 0.15;
  return Math.min(q, 1.0);
}

function estimateCostEfficiency(model: { inputPrice?: number; outputPrice?: number }): number {
  const cost = (model.inputPrice ?? 0) + (model.outputPrice ?? 0);
  return 1 / (1 + cost);
}

function estimateLatencyScore(latencyMs: number): number {
  return 1 / (1 + latencyMs / 1000);
}
