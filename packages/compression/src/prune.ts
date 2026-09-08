import type { ContextItem, SafetyClassification } from './types';

export interface PruneResult {
  originalCount: number;
  optimizedCount: number;
  removedIds: string[];
  tokensSaved: number;
  applied: boolean;
  confidence: SafetyClassification;
}

const CHARS_PER_TOKEN = 4;

export function pruneContext(items: ContextItem[]): PruneResult {
  const protectedIds = new Set<string>();
  const candidates = items.filter(item => {
    if (item.referenced) {
      protectedIds.add(item.id);
      return false;
    }
    if (item.type === 'system' || item.type === 'metadata') {
      protectedIds.add(item.id);
      return false;
    }
    if (item.dependencies.length > 0 && item.dependencies.some(dep => !protectedIds.has(dep))) {
      return false;
    }
    return true;
  });

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.age - a.age;
  });

  const toRemove = candidates.slice(0, Math.max(0, candidates.length - Math.floor(candidates.length * 0.3)));
  const removeIds = new Set(toRemove.map(i => i.id));
  let tokensSaved = 0;

  for (const item of items) {
    if (removeIds.has(item.id)) {
      tokensSaved += item.tokens;
    }
  }

  const optimizedCount = items.filter(i => !removeIds.has(i.id)).length;

  return {
    originalCount: items.length,
    optimizedCount,
    removedIds: Array.from(removeIds),
    tokensSaved,
    applied: removeIds.size > 0,
    confidence: 'MEDIUM',
  };
}
