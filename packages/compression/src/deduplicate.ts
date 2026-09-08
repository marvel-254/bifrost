import type { ContextItem, ContextType, SafetyClassification } from './types';

export interface DedupResult {
  originalCount: number;
  optimizedCount: number;
  removedIds: string[];
  tokensSaved: number;
  applied: boolean;
  confidence: SafetyClassification;
}

const CHARS_PER_TOKEN = 4;

function hashContent(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return String(hash);
}

function normalizeForDedup(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

export function deduplicateContext(items: ContextItem[]): DedupResult {
  const seen = new Map<string, string[]>();
  const toRemove = new Set<string>();
  let tokensSaved = 0;

  for (const item of items) {
    const normalized = normalizeForDedup(item.content);
    const hash = hashContent(normalized);

    if (seen.has(hash)) {
      const existingIds = seen.get(hash)!;
      if (existingIds.length > 0) {
        const first = existingIds[0];
        if (item.id !== first) {
          toRemove.add(item.id);
          tokensSaved += item.tokens;
        }
        existingIds.push(item.id);
      }
    } else {
      seen.set(hash, [item.id]);
    }
  }

  const optimizedCount = items.filter(i => !toRemove.has(i.id)).length;
  return {
    originalCount: items.length,
    optimizedCount,
    removedIds: Array.from(toRemove),
    tokensSaved,
    applied: toRemove.size > 0,
    confidence: 'SAFE',
  };
}
