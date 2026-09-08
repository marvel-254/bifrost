import { ModelRegistry } from '../src/index';
import { Model } from '../src/types';

function makeModel(overrides: Partial<Model> = {}): Model {
  return {
    id: 'gpt-4',
    provider: 'openai',
    displayName: 'GPT-4',
    contextWindow: 8192,
    capabilities: ['chat', 'completion'],
    inputPrice: 0.01,
    outputPrice: 0.03,
    enabled: true,
    ...overrides,
  };
}

describe('ModelRegistry', () => {
  let registry: ModelRegistry;

  beforeEach(() => {
    registry = new ModelRegistry();
  });

  describe('registerModel', () => {
    test('registers a model', () => {
      const model = makeModel({ id: 'm1', provider: 'p1' });
      registry.registerModel(model);
      expect(registry.getModel('m1')).toEqual(model);
    });

    test('throws without id', () => {
      expect(() => registry.registerModel(makeModel({ id: '' }))).toThrow('Model must have an id');
    });

    test('throws without provider', () => {
      expect(() => registry.registerModel(makeModel({ provider: '' }))).toThrow('Model must have a provider');
    });

    test('allows re-registration (updates)', () => {
      registry.registerModel(makeModel({ id: 'm1', displayName: 'A' }));
      registry.registerModel(makeModel({ id: 'm1', displayName: 'B' }));
      expect(registry.getModel('m1')!.displayName).toBe('B');
    });
  });

  describe('getModel', () => {
    test('returns undefined for unknown model', () => {
      expect(registry.getModel('nonexistent')).toBeUndefined();
    });

    test('returns model by id', () => {
      const model = makeModel({ id: 'xyz' });
      registry.registerModel(model);
      expect(registry.getModel('xyz')).toEqual(model);
    });
  });

  describe('listModels', () => {
    test('returns empty array initially', () => {
      expect(registry.listModels()).toEqual([]);
    });

    test('returns all registered models', () => {
      registry.registerModel(makeModel({ id: 'a', provider: 'p' }));
      registry.registerModel(makeModel({ id: 'b', provider: 'p' }));
      expect(registry.listModels()).toHaveLength(2);
    });
  });

  describe('listModelsByProvider', () => {
    test('returns empty for unknown provider', () => {
      expect(registry.listModelsByProvider('missing')).toEqual([]);
    });

    test('returns models for provider', () => {
      registry.registerModel(makeModel({ id: 'a', provider: 'google' }));
      registry.registerModel(makeModel({ id: 'b', provider: 'google' }));
      registry.registerModel(makeModel({ id: 'c', provider: 'groq' }));
      expect(registry.listModelsByProvider('google')).toHaveLength(2);
      expect(registry.listModelsByProvider('groq')).toHaveLength(1);
    });
  });

  describe('filterByCapability', () => {
    test('returns models with capability', () => {
      registry.registerModel(makeModel({ id: 'a', capabilities: ['chat'] }));
      registry.registerModel(makeModel({ id: 'b', capabilities: ['vision'] }));
      registry.registerModel(makeModel({ id: 'c', capabilities: ['chat', 'vision'] }));
      const result = registry.filterByCapability('vision');
      expect(result).toHaveLength(2);
      expect(result.map(m => m.id)).toEqual(['b', 'c']);
    });

    test('returns empty for unmatched capability', () => {
      expect(registry.filterByCapability('nonexistent')).toEqual([]);
    });
  });

  describe('isEnabled', () => {
    test('returns false for unknown model', () => {
      expect(registry.isEnabled('unknown')).toBe(false);
    });

    test('returns true for enabled model', () => {
      registry.registerModel(makeModel({ id: 'x', enabled: true }));
      expect(registry.isEnabled('x')).toBe(true);
    });

    test('returns false for disabled model', () => {
      registry.registerModel(makeModel({ id: 'y', enabled: false }));
      expect(registry.isEnabled('y')).toBe(false);
    });
  });

  describe('getModelCount', () => {
    test('returns 0 initially', () => {
      expect(registry.getModelCount()).toBe(0);
    });

    test('returns count after registration', () => {
      registry.registerModel(makeModel({ id: 'a' }));
      registry.registerModel(makeModel({ id: 'b' }));
      expect(registry.getModelCount()).toBe(2);
    });
  });

  describe('getProviderCount', () => {
    test('returns 0 initially', () => {
      expect(registry.getProviderCount()).toBe(0);
    });

    test('counts unique providers', () => {
      registry.registerModel(makeModel({ id: 'a', provider: 'p1' }));
      registry.registerModel(makeModel({ id: 'b', provider: 'p1' }));
      registry.registerModel(makeModel({ id: 'c', provider: 'p2' }));
      expect(registry.getProviderCount()).toBe(2);
    });
  });

  describe('enable/disable', () => {
    test('disableModel sets enabled to false', () => {
      registry.registerModel(makeModel({ id: 'x', enabled: true }));
      registry.disableModel('x');
      expect(registry.isEnabled('x')).toBe(false);
    });

    test('enableModel sets enabled to true', () => {
      registry.registerModel(makeModel({ id: 'x', enabled: false }));
      registry.enableModel('x');
      expect(registry.isEnabled('x')).toBe(true);
    });

    test('no-op for unknown model', () => {
      expect(() => registry.disableModel('unknown')).not.toThrow();
      expect(() => registry.enableModel('unknown')).not.toThrow();
    });
  });

  describe('clear', () => {
    test('removes all models', () => {
      registry.registerModel(makeModel({ id: 'a' }));
      registry.registerModel(makeModel({ id: 'b' }));
      registry.clear();
      expect(registry.getModelCount()).toBe(0);
      expect(registry.listModels()).toEqual([]);
    });
  });

  describe('constructor config', () => {
    test('loads models from config', () => {
      const config = {
        models: [
          makeModel({ id: 'm1', provider: 'p1' }),
          makeModel({ id: 'm2', provider: 'p2' }),
        ]
      };
      const reg = new ModelRegistry(config);
      expect(reg.getModelCount()).toBe(2);
      expect(reg.getModel('m1')).toBeDefined();
      expect(reg.getModel('m2')).toBeDefined();
    });

    test('handles empty config', () => {
      const reg = new ModelRegistry({ models: [] });
      expect(reg.getModelCount()).toBe(0);
    });

    test('handles undefined config', () => {
      const reg = new ModelRegistry();
      expect(reg.getModelCount()).toBe(0);
    });
  });
});
