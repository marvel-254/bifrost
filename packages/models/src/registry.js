"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
class ModelRegistry {
    models = new Map();
    byProvider = new Map();
    constructor(config) {
        if (config?.models) {
            for (const model of config.models) {
                this.registerModel(model);
            }
        }
    }
    registerModel(model) {
        if (!model.id)
            throw new Error('Model must have an id');
        if (!model.provider)
            throw new Error('Model must have a provider');
        this.models.set(model.id, model);
        const list = this.byProvider.get(model.provider) || [];
        list.push(model);
        this.byProvider.set(model.provider, list);
    }
    getModel(id) {
        return this.models.get(id);
    }
    listModels() {
        return Array.from(this.models.values());
    }
    listModelsByProvider(provider) {
        return this.byProvider.get(provider) || [];
    }
    filterByCapability(capability) {
        return Array.from(this.models.values()).filter(m => m.capabilities.includes(capability));
    }
    isEnabled(modelId) {
        const model = this.models.get(modelId);
        return model ? model.enabled : false;
    }
    getModelCount() {
        return this.models.size;
    }
    getProviderCount() {
        return this.byProvider.size;
    }
    disableModel(id) {
        const model = this.models.get(id);
        if (model)
            model.enabled = false;
    }
    enableModel(id) {
        const model = this.models.get(id);
        if (model)
            model.enabled = true;
    }
    clear() {
        this.models.clear();
        this.byProvider.clear();
    }
}
exports.ModelRegistry = ModelRegistry;
//# sourceMappingURL=registry.js.map