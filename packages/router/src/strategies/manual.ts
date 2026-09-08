/**
 * Manual routing strategy.
 *
 * Client specifies `provider` and `model` explicitly.
 * Router validates the model exists and is enabled, then returns it.
 * No scoring, no fallback selection — just passthrough with validation.
 */
import { RoutingStrategy, RoutingResult, StrategyInput, Candidate } from '../engine';
import { ModelRegistry } from '@bifrost/models';
import { ProviderRegistry } from '@bifrost/providers';

export class ManualStrategy implements RoutingStrategy {
  readonly name = 'manual';

  constructor(
    private models: ModelRegistry,
    private providers: ProviderRegistry
  ) {}

  async route(input: StrategyInput): Promise<RoutingResult> {
    const { provider, model, capabilities } = input;

    if (provider && model) {
      const m = this.models.getModel(model);
      if (!m) {
        return { selected: null, error: `Model "${model}" not found`, candidates: [] };
      }
      if (!m.enabled) {
        return { selected: null, error: `Model "${model}" is disabled`, candidates: [] };
      }
      if (m.provider !== provider) {
        return { selected: null, error: `Model "${model}" belongs to provider "${m.provider}", not "${provider}"`, candidates: [] };
      }
      if (capabilities && !capabilities.every(c => m.capabilities.includes(c))) {
        const missing = capabilities.filter(c => !m.capabilities.includes(c));
        return { selected: null, error: `Model "${model}" does not support: ${missing.join(', ')}`, candidates: [] };
      }

      const p = this.providers.getProvider(provider);
      if (!p) {
        return { selected: null, error: `Provider "${provider}" not registered`, candidates: [] };
      }

      return {
        selected: { provider, model },
        candidates: [{ provider, model, score: 100 }],
        metadata: { strategy: 'manual', reason: 'client-specified' },
      };
    }

    if (model) {
      const m = this.models.getModel(model);
      if (!m) {
        return { selected: null, error: `Model "${model}" not found`, candidates: [] };
      }
      if (!m.enabled) {
        return { selected: null, error: `Model "${model}" is disabled`, candidates: [] };
      }

      const p = this.providers.getProvider(m.provider);
      if (!p) {
        return { selected: null, error: `Provider "${m.provider}" not registered`, candidates: [] };
      }

      if (capabilities && !capabilities.every(c => m.capabilities.includes(c))) {
        const missing = capabilities.filter(c => !m.capabilities.includes(c));
        return { selected: null, error: `Model "${model}" does not support: ${missing.join(', ')}`, candidates: [] };
      }

      return {
        selected: { provider: m.provider, model },
        candidates: [{ provider: m.provider, model, score: 100 }],
        metadata: { strategy: 'manual', reason: 'model-resolved' },
      };
    }

    // Neither specified — pick first enabled model from default provider
    const defaultProvider = this.providers.getDefaultProvider();
    if (!defaultProvider) {
      return { selected: null, error: 'No default provider configured', candidates: [] };
    }

    const allModels = this.models.listModels();
    const defaultModel = allModels.find(m => m.provider === defaultProvider && m.enabled);
    if (!defaultModel) {
      return { selected: null, error: `No default model for provider "${defaultProvider}"`, candidates: [] };
    }

    return {
      selected: { provider: defaultProvider, model: defaultModel.id },
      candidates: [{ provider: defaultProvider, model: defaultModel.id, score: 100 }],
      metadata: { strategy: 'manual', reason: 'default-fallback' },
    };
  }
}
