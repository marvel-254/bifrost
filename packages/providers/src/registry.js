"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
exports.createDefaultRegistry = createDefaultRegistry;
class ProviderRegistry {
    providers = new Map();
    providerOrder = [];
    defaultProvider;
    constructor(config) {
        if (config?.defaultProvider) {
            this.defaultProvider = config.defaultProvider;
        }
        if (config?.providers) {
            for (const p of config.providers) {
                if (p.enabled) {
                    this.providerOrder.push(p.name);
                    // Seed the providers map with a placeholder so
                    // listProviders() reflects the configured set.
                    this.providers.set(p.name, null);
                }
            }
        }
    }
    register(provider) {
        if (!provider.name)
            throw new Error('Provider must have a name');
        this.providers.set(provider.name, provider);
        if (!this.providerOrder.includes(provider.name)) {
            this.providerOrder.push(provider.name);
        }
    }
    getProvider(name) {
        return this.providers.get(name);
    }
    listProviders() {
        return [...this.providers.keys()];
    }
    getDefaultProvider() {
        return this.defaultProvider;
    }
    setDefaultProvider(name) {
        if (this.providers.has(name)) {
            this.defaultProvider = name;
        }
    }
    getProviderCount() {
        return this.providers.size;
    }
    clear() {
        this.providers.clear();
        this.providerOrder = [];
        this.defaultProvider = undefined;
    }
}
exports.ProviderRegistry = ProviderRegistry;
function createDefaultRegistry() {
    const registry = new ProviderRegistry({ defaultProvider: 'ollama' });
    return registry;
}
//# sourceMappingURL=registry.js.map