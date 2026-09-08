import { Model, ModelConfig } from './types.js';

export class ModelRegistry {
  private models: Map<string, Model> = new Map();
  private byProvider: Map<string, Model[]> = new Map();

  constructor(config?: ModelConfig) {
    if (config?.models) {
      for (const model of config.models) {
        this.registerModel(model);
      }
    }
  }

  registerModel(model: Model): void {
    if (!model.id) throw new Error('Model must have an id');
    if (!model.provider) throw new Error('Model must have a provider');
    this.models.set(model.id, model);
    const list = this.byProvider.get(model.provider) || [];
    list.push(model);
    this.byProvider.set(model.provider, list);
  }

  getModel(id: string): Model | undefined {
    return this.models.get(id);
  }

  listModels(): Model[] {
    return Array.from(this.models.values());
  }

  listModelsByProvider(provider: string): Model[] {
    return this.byProvider.get(provider) || [];
  }

  filterByCapability(capability: string): Model[] {
    return Array.from(this.models.values()).filter(m => m.capabilities.includes(capability));
  }

  isEnabled(modelId: string): boolean {
    const model = this.models.get(modelId);
    return model ? model.enabled : false;
  }

  getModelCount(): number {
    return this.models.size;
  }

  getProviderCount(): number {
    return this.byProvider.size;
  }

  disableModel(id: string): void {
    const model = this.models.get(id);
    if (model) model.enabled = false;
  }

  enableModel(id: string): void {
    const model = this.models.get(id);
    if (model) model.enabled = true;
  }

  clear(): void {
    this.models.clear();
    this.byProvider.clear();
  }
}
