import { ModelRegistry } from '../src/index.js';

const registry = new ModelRegistry({
  models: [
    { id: 'llama3', provider: 'ollama', displayName: 'Llama 3', contextWindow: 8192, capabilities: ['chat', 'completion', 'tool_use'], inputPrice: 0, outputPrice: 0, enabled: true },
    { id: 'mistral', provider: 'ollama', displayName: 'Mistral', contextWindow: 32768, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
    { id: 'llama3.1', provider: 'ollama', displayName: 'Llama 3.1', contextWindow: 128000, capabilities: ['chat', 'completion', 'tool_use', 'vision'], inputPrice: 0, outputPrice: 0, enabled: true },
    { id: 'gemma2', provider: 'ollama', displayName: 'Gemma 2', contextWindow: 8192, capabilities: ['chat', 'completion'], inputPrice: 0, outputPrice: 0, enabled: true },
  ]
});

console.log(`Loaded ${registry.getModelCount()} models from ${registry.getProviderCount()} providers:`);
for (const model of registry.listModels()) {
  console.log(`  ${model.id.padEnd(12)} ${model.displayName.padEnd(16)} ctx=${String(model.contextWindow).padEnd(7)} caps=[${model.capabilities.join(',')}] enabled=${model.enabled}`);
}

export {};
