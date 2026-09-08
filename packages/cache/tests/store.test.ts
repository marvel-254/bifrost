import { InMemoryCacheStore } from '../src/store';
import type { CacheEntry } from '../src/types';

describe('InMemoryCacheStore', () => {
  let store: InMemoryCacheStore;

  beforeEach(() => {
    store = new InMemoryCacheStore({ maxEntries: 100, maxSizeBytes: 1024 * 1024 });
  });

  const createEntry = (overrides: Partial<CacheEntry> = {}): CacheEntry => ({
    key: 'test-key',
    requestFingerprint: 'fp1',
    semanticFingerprint: 'fp2',
    response: {
      id: 'resp-1',
      object: 'chat.completion',
      created: Date.now(),
      model: 'openai/gpt-4o',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Hello' }, finish_reason: 'stop' }],
    },
    tenantId: 'tenant-1',
    model: 'openai/gpt-4o',
    provider: 'openai',
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000,
    hitCount: 0,
    ...overrides,
  });

  it('should store and retrieve an entry', async () => {
    const entry = createEntry({ key: 'key-1' });
    await store.set('key-1', entry);
    const retrieved = await store.get('key-1');
    expect(retrieved).toEqual(entry);
  });

  it('should return null for non-existent key', async () => {
    const retrieved = await store.get('non-existent');
    expect(retrieved).toBeNull();
  });

  it('should delete an entry', async () => {
    const entry = createEntry({ key: 'key-1' });
    await store.set('key-1', entry);
    await store.delete('key-1');
    const retrieved = await store.get('key-1');
    expect(retrieved).toBeNull();
  });

  it('should clear all entries', async () => {
    await store.set('key-1', createEntry({ key: 'key-1' }));
    await store.set('key-2', createEntry({ key: 'key-2' }));
    await store.clear();
    expect(await store.get('key-1')).toBeNull();
    expect(await store.get('key-2')).toBeNull();
    expect(await store.size()).toBe(0);
  });

  it('should return correct size', async () => {
    expect(await store.size()).toBe(0);
    await store.set('key-1', createEntry({ key: 'key-1' }));
    expect(await store.size()).toBe(1);
    await store.set('key-2', createEntry({ key: 'key-2' }));
    expect(await store.size()).toBe(2);
  });

  it('should expire entries based on expiresAt', async () => {
    const entry = createEntry({
      key: 'key-1',
      expiresAt: Date.now() - 1000,
    });
    await store.set('key-1', entry);
    const retrieved = await store.get('key-1');
    expect(retrieved).toBeNull();
  });

  it('should not expire entries with expiresAt = 0', async () => {
    const entry = createEntry({
      key: 'key-1',
      expiresAt: 0,
    });
    await store.set('key-1', entry);
    const retrieved = await store.get('key-1');
    expect(retrieved).not.toBeNull();
  });

  it('should increment hitCount on get', async () => {
    const entry = createEntry({ key: 'key-1', hitCount: 0 });
    await store.set('key-1', entry);
    await store.get('key-1');
    await store.get('key-1');
    const retrieved = await store.get('key-1');
    expect(retrieved?.hitCount).toBe(3);
  });

  it('should evict LRU entries when maxEntries exceeded', async () => {
    const smallStore = new InMemoryCacheStore({ maxEntries: 3, evictionPolicy: 'LRU' });
    await smallStore.set('key-1', createEntry({ key: 'key-1' }));
    await smallStore.set('key-2', createEntry({ key: 'key-2' }));
    await smallStore.set('key-3', createEntry({ key: 'key-3' }));
    await smallStore.set('key-4', createEntry({ key: 'key-4' }));
    expect(await smallStore.get('key-1')).toBeNull();
    expect(await smallStore.get('key-2')).not.toBeNull();
    expect(await smallStore.get('key-3')).not.toBeNull();
    expect(await smallStore.get('key-4')).not.toBeNull();
  });

  it('should evict LFU entries when maxEntries exceeded', async () => {
    const smallStore = new InMemoryCacheStore({ maxEntries: 3, evictionPolicy: 'LFU' });
    await smallStore.set('key-1', createEntry({ key: 'key-1' }));
    await smallStore.set('key-2', createEntry({ key: 'key-2' }));
    await smallStore.set('key-3', createEntry({ key: 'key-3' }));
    await smallStore.get('key-1');
    await smallStore.get('key-1');
    await smallStore.get('key-2');
    await smallStore.set('key-4', createEntry({ key: 'key-4' }));
    expect(await smallStore.get('key-3')).toBeNull();
    expect(await smallStore.get('key-1')).not.toBeNull();
    expect(await smallStore.get('key-2')).not.toBeNull();
    expect(await smallStore.get('key-4')).not.toBeNull();
  });

  it('should evict by size when maxSizeBytes exceeded', async () => {
    const smallStore = new InMemoryCacheStore({ maxEntries: 100, maxSizeBytes: 5000 });
    const largeEntry = createEntry({
      key: 'key-1',
      response: {
        id: 'resp-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'openai/gpt-4o',
        choices: [{ index: 0, message: { role: 'assistant', content: 'x'.repeat(2000) }, finish_reason: 'stop' }],
      },
    });
    await smallStore.set('key-1', largeEntry);
    await smallStore.set('key-2', createEntry({ key: 'key-2' }));
    expect(await smallStore.get('key-1')).toBeNull();
    expect(await smallStore.get('key-2')).not.toBeNull();
  });

  it('should get entries by pattern', async () => {
    await store.set('cache:tenant-1:model1:exact:abc', createEntry({ key: 'cache:tenant-1:model1:exact:abc' }));
    await store.set('cache:tenant-1:model2:exact:def', createEntry({ key: 'cache:tenant-1:model2:exact:def' }));
    await store.set('cache:tenant-2:model1:exact:ghi', createEntry({ key: 'cache:tenant-2:model1:exact:ghi' }));

    const results = await store.getByPattern('cache:tenant-1:.*');
    expect(results).toHaveLength(2);
  });

  it('should update entry on set with same key', async () => {
    const entry1 = createEntry({ key: 'key-1', hitCount: 5 });
    await store.set('key-1', entry1);
    const entry2 = createEntry({ key: 'key-1', hitCount: 10 });
    await store.set('key-1', entry2);
    // hitCount is from the new entry, get() increments it
    const retrieved = await store.get('key-1');
    expect(retrieved?.hitCount).toBe(11);
  });

  it('should provide stats', async () => {
    await store.set('key-1', createEntry({ key: 'key-1' }));
    const stats = store.getStats();
    expect(stats.entries).toBe(1);
    expect(stats.sizeBytes).toBeGreaterThan(0);
  });
});