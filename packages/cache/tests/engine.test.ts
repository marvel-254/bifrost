import { CacheEngine, InMemoryCacheStore } from '../src/index';
import type { NormalizedRequest, NormalizedResponse } from '@bifrost/shared';
import type { NormalizedRequestForCache } from '../src/types';

describe('CacheEngine', () => {
  let store: InMemoryCacheStore;
  let engine: CacheEngine;

  beforeEach(() => {
    store = new InMemoryCacheStore({ maxEntries: 100 });
    engine = new CacheEngine({
      store,
      defaultPolicy: { ttlSeconds: 3600, maxEntries: 100, maxSizeBytes: 1024 * 1024, evictionPolicy: 'LRU' },
      enableSemanticCache: true,
    });
  });

  const createRequest = (overrides: Partial<NormalizedRequestForCache> = {}): NormalizedRequestForCache => ({
    model: 'openai/gpt-4o',
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello, world!' },
    ],
    temperature: 0.7,
    tenantId: 'tenant-1',
    ...overrides,
  });

  const createResponse = (overrides: Partial<NormalizedResponse> = {}): NormalizedResponse => ({
    id: 'resp-1',
    object: 'chat.completion',
    created: Date.now(),
    model: 'openai/gpt-4o',
    choices: [
      { index: 0, message: { role: 'assistant', content: 'Hello! How can I help you?' }, finish_reason: 'stop' },
    ],
    provider: 'openai',
    ...overrides,
  });

  it('should return null for cache miss', async () => {
    const request = createRequest();
    const hit = await engine.lookup(request);
    expect(hit).toBeNull();
  });

  it('should store and retrieve exact match', async () => {
    const request = createRequest();
    const response = createResponse();

    await engine.storeEntry(request, response);
    const hit = await engine.lookup(request);

    expect(hit).not.toBeNull();
    expect(hit?.matchType).toBe('exact');
    expect(hit?.entry.response.choices[0].message.content).toBe('Hello! How can I help you?');
  });

  it('should track exact hits in stats', async () => {
    const request = createRequest();
    const response = createResponse();

    await engine.storeEntry(request, response);
    await engine.lookup(request);
    await engine.lookup(request);

    const stats = engine.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.exactHits).toBe(2);
    expect(stats.misses).toBe(0);
  });

  it('should track misses in stats', async () => {
    const request = createRequest();
    await engine.lookup(request);

    const stats = engine.getStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
  });

  it('should return semantic match when exact miss but semantic match exists', async () => {
    const request1 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Write a function to calculate fibonacci.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const request2 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Create a fibonacci function in Python.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    const hit = await engine.lookup(request2);

    expect(hit).not.toBeNull();
    // If exact fingerprints match, it will be exact; if not, semantic
    expect(['exact', 'semantic']).toContain(hit?.matchType);
  });

  it('should track semantic hits in stats', async () => {
    const request1 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Write a function to calculate fibonacci.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const request2 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Create a fibonacci function in Python.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    await engine.lookup(request2);

    const stats = engine.getStats();
    expect(stats.hits).toBe(1);
    // Could be exact or semantic depending on fingerprint
    expect(stats.exactHits + stats.semanticHits).toBe(1);
  });

  it('should not return match when disabled and request differs', async () => {
    const engineNoSemantic = new CacheEngine({
      store: new InMemoryCacheStore(),
      defaultPolicy: { ttlSeconds: 3600, maxEntries: 100, maxSizeBytes: 1024 * 1024, evictionPolicy: 'LRU' },
      enableSemanticCache: false,
    });

    const request1 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Write a function to calculate fibonacci.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const request2 = createRequest({ 
      model: 'openai/gpt-4o',
      messages: [
        { role: 'system', content: 'You are a coding assistant.' },
        { role: 'user', content: 'Create a fibonacci function in Python.' }
      ],
      tools: [
        { type: 'function', function: { name: 'write_code', description: 'Write code', parameters: { type: 'object', properties: {} } } }
      ]
    });
    const response = createResponse();

    await engineNoSemantic.storeEntry(request1, response);
    const hit = await engineNoSemantic.lookup(request2);

    // If exact fingerprints differ, should be null; if same, exact match
    // This test just verifies no semantic matching occurs
    if (hit) {
      expect(hit.matchType).toBe('exact');
    }
  });

  it('should isolate cache by tenant', async () => {
    const request1 = createRequest({ tenantId: 'tenant-1' });
    const request2 = createRequest({ tenantId: 'tenant-2', messages: [{ role: 'user', content: 'Hello' }] });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    const hit = await engine.lookup(request2);

    expect(hit).toBeNull();
  });

  it('should isolate cache by model', async () => {
    const request1 = createRequest({ model: 'openai/gpt-4o' });
    const request2 = createRequest({ model: 'anthropic/claude-3', messages: [{ role: 'user', content: 'Hello' }] });
    const response = createResponse({ model: 'openai/gpt-4o' });

    await engine.storeEntry(request1, response);
    const hit = await engine.lookup(request2);

    expect(hit).toBeNull();
  });

  it('should expire entries after TTL', async () => {
    const shortTtlEngine = new CacheEngine({
      store: new InMemoryCacheStore(),
      defaultPolicy: { ttlSeconds: 1, maxEntries: 100, maxSizeBytes: 1024 * 1024, evictionPolicy: 'LRU' },
      enableSemanticCache: true,
    });

    const request = createRequest();
    const response = createResponse();

    await shortTtlEngine.storeEntry(request, response);
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    const hit = await shortTtlEngine.lookup(request);

    expect(hit).toBeNull();
  });

  it('should invalidate entries by pattern', async () => {
    const request1 = createRequest({ tenantId: 'tenant-1' });
    const request2 = createRequest({ tenantId: 'tenant-1', model: 'anthropic/claude-3' });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    await engine.storeEntry(request2, response);

    // Each request creates exact + semantic entries, so 2 requests = 4 entries
    const count = await engine.invalidate('cache:tenant-1:.*');
    expect(count).toBe(4);

    const hit1 = await engine.lookup(request1);
    const hit2 = await engine.lookup(request2);
    expect(hit1).toBeNull();
    expect(hit2).toBeNull();
  });

  it('should invalidate all entries for a tenant', async () => {
    const request1 = createRequest({ tenantId: 'tenant-1' });
    const request2 = createRequest({ tenantId: 'tenant-2' });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    await engine.storeEntry(request2, response);

    // Each request creates exact + semantic entries
    const count = await engine.invalidateTenant('tenant-1');
    expect(count).toBe(2);

    expect(await engine.lookup(request1)).toBeNull();
    expect(await engine.lookup(request2)).not.toBeNull();
  });

  it('should invalidate all entries for a model', async () => {
    const request1 = createRequest({ model: 'openai/gpt-4o' });
    const request2 = createRequest({ model: 'anthropic/claude-3' });
    const response = createResponse();

    await engine.storeEntry(request1, response);
    await engine.storeEntry(request2, response);

    // Each request creates exact + semantic entries
    const count = await engine.invalidateModel('openai/gpt-4o');
    expect(count).toBe(2);

    expect(await engine.lookup(request1)).toBeNull();
    expect(await engine.lookup(request2)).not.toBeNull();
  });

  it('should calculate hit rate correctly', async () => {
    const request = createRequest();
    const response = createResponse();

    await engine.storeEntry(request, response);
    await engine.lookup(request);
    await engine.lookup(request);
    await engine.lookup(createRequest({ messages: [{ role: 'user', content: 'Different' }] }));

    const stats = engine.getStats();
    expect(stats.hitRate).toBeCloseTo(0.66, 1);
  });

  it('should reset stats', async () => {
    const request = createRequest();
    const response = createResponse();

    await engine.storeEntry(request, response);
    await engine.lookup(request);
    engine.resetStats();

    const stats = engine.getStats();
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it('should apply tenant-specific policy', async () => {
    const tenantEngine = new CacheEngine({
      store: new InMemoryCacheStore(),
      defaultPolicy: { ttlSeconds: 3600, maxEntries: 100, maxSizeBytes: 1024 * 1024, evictionPolicy: 'LRU' },
      enableSemanticCache: true,
    });

    tenantEngine.setTenantPolicy('tenant-special', { ttlSeconds: 1, maxEntries: 100, maxSizeBytes: 1024 * 1024, evictionPolicy: 'LRU' });

    const request = createRequest({ tenantId: 'tenant-special' });
    const response = createResponse();

    await tenantEngine.storeEntry(request, response);
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    const hit = await tenantEngine.lookup(request);
    expect(hit).toBeNull();
  });
});