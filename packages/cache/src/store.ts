import type { CacheStore, CacheEntry } from './types';

export interface InMemoryCacheStoreOptions {
  maxEntries?: number;
  maxSizeBytes?: number;
  evictionPolicy?: 'LRU' | 'LFU';
}

interface CacheNode {
  key: string;
  entry: CacheEntry;
  prev: CacheNode | null;
  next: CacheNode | null;
  accessCount: number;
  lastAccessed: number;
  sizeBytes: number;
}

export class InMemoryCacheStore implements CacheStore {
  private map = new Map<string, CacheNode>();
  private head: CacheNode | null = null;
  private tail: CacheNode | null = null;
  private currentSizeBytes = 0;
  private readonly maxEntries: number;
  private readonly maxSizeBytes: number;
  private readonly evictionPolicy: 'LRU' | 'LFU';

  constructor(options: InMemoryCacheStoreOptions = {}) {
    this.maxEntries = options.maxEntries ?? 10000;
    this.maxSizeBytes = options.maxSizeBytes ?? 100 * 1024 * 1024;
    this.evictionPolicy = options.evictionPolicy ?? 'LRU';
  }

  private estimateEntrySize(entry: CacheEntry): number {
    return JSON.stringify(entry).length * 2;
  }

  private addToHead(node: CacheNode): void {
    node.next = this.head;
    node.prev = null;
    if (this.head) {
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
  }

  private removeNode(node: CacheNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
    node.prev = null;
    node.next = null;
  }

  private moveToHead(node: CacheNode): void {
    this.removeNode(node);
    this.addToHead(node);
  }

  private evictIfNeeded(): void {
    while (
      (this.maxEntries > 0 && this.map.size > this.maxEntries) ||
      (this.maxSizeBytes > 0 && this.currentSizeBytes >= this.maxSizeBytes)
    ) {
      if (!this.tail) break;
      
      let victim: CacheNode = this.tail!;
      if (this.evictionPolicy === 'LFU') {
        // Find the least frequently used node, scanning from tail (oldest) to head (newest)
        // to prefer evicting older entries in case of frequency ties
        let current: CacheNode | null = this.tail;
        while (current) {
          if (current.accessCount < victim.accessCount) {
            victim = current;
          }
          current = current.prev;
        }
      }
      // LRU: victim is already the tail
      
      this.removeNode(victim);
      this.map.delete(victim.key);
      this.currentSizeBytes -= victim.sizeBytes;
    }
  }

  async get(key: string): Promise<CacheEntry | null> {
    const node = this.map.get(key);
    if (!node) return null;

    const now = Date.now();
    if (node.entry.expiresAt > 0 && node.entry.expiresAt < now) {
      this.removeNode(node);
      this.map.delete(key);
      this.currentSizeBytes -= node.sizeBytes;
      return null;
    }

    node.accessCount++;
    node.entry.hitCount++;
    node.lastAccessed = now;

    if (this.evictionPolicy === 'LRU') {
      this.moveToHead(node);
    }

    return node.entry;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const existing = this.map.get(key);
    if (existing) {
      this.removeNode(existing);
      this.currentSizeBytes -= existing.sizeBytes;
    }

    const sizeBytes = this.estimateEntrySize(entry);
    const node: CacheNode = {
      key,
      entry,
      prev: null,
      next: null,
      accessCount: 1,
      lastAccessed: Date.now(),
      sizeBytes,
    };

    this.addToHead(node);
    this.map.set(key, node);
    this.currentSizeBytes += sizeBytes;

    this.evictIfNeeded();
  }

  async delete(key: string): Promise<void> {
    const node = this.map.get(key);
    if (node) {
      this.removeNode(node);
      this.map.delete(key);
      this.currentSizeBytes -= node.sizeBytes;
    }
  }

  async clear(): Promise<void> {
    this.map.clear();
    this.head = null;
    this.tail = null;
    this.currentSizeBytes = 0;
  }

  async size(): Promise<number> {
    return this.map.size;
  }

  async getByPattern(pattern: string): Promise<CacheEntry[]> {
    const regex = new RegExp(pattern.replace('*', '.*'));
    const results: CacheEntry[] = [];
    const now = Date.now();

    for (const node of this.map.values()) {
      if (regex.test(node.key)) {
        if (node.entry.expiresAt === 0 || node.entry.expiresAt >= now) {
          results.push(node.entry);
        }
      }
    }

    return results;
  }

  getStats(): { entries: number; sizeBytes: number; maxEntries: number; maxSizeBytes: number } {
    return {
      entries: this.map.size,
      sizeBytes: this.currentSizeBytes,
      maxEntries: this.maxEntries,
      maxSizeBytes: this.maxSizeBytes,
    };
  }
}

export function createRedisCacheStore(
  redisUrl: string,
  _options?: { keyPrefix?: string; defaultTtl?: number }
): CacheStore {
  throw new Error('Redis cache store not yet implemented. Use InMemoryCacheStore for development.');
}