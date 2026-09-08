import { Model, ModelConfig } from './types.js';
export declare class ModelRegistry {
    private models;
    private byProvider;
    constructor(config?: ModelConfig);
    registerModel(model: Model): void;
    getModel(id: string): Model | undefined;
    listModels(): Model[];
    listModelsByProvider(provider: string): Model[];
    filterByCapability(capability: string): Model[];
    isEnabled(modelId: string): boolean;
    getModelCount(): number;
    getProviderCount(): number;
    disableModel(id: string): void;
    enableModel(id: string): void;
    clear(): void;
}
