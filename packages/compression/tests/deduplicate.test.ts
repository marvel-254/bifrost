import { deduplicateContext } from '../src/deduplicate';
import type { ContextItem } from '../src/types';

describe('deduplicateContext', () => {
  function makeItem(id: string, content: string, tokens = 10): ContextItem {
    return { id, type: 'user', content, tokens, age: 0, referenced: true, priority: 5, dependencies: [] };
  }

  test('removes exact duplicates', () => {
    const items = [makeItem('a', 'hello world'), makeItem('b', 'hello world')];
    const result = deduplicateContext(items);
    expect(result.applied).toBe(true);
    expect(result.removedIds).toContain('b');
    expect(result.optimizedCount).toBe(1);
  });

  test('keeps unique items', () => {
    const items = [makeItem('a', 'hello'), makeItem('b', 'world')];
    const result = deduplicateContext(items);
    expect(result.applied).toBe(false);
    expect(result.optimizedCount).toBe(2);
  });

  test('reports SAFE confidence', () => {
    const items = [makeItem('a', 'x'), makeItem('b', 'x')];
    const result = deduplicateContext(items);
    expect(result.confidence).toBe('SAFE');
  });

  test('handles empty array', () => {
    const result = deduplicateContext([]);
    expect(result.applied).toBe(false);
    expect(result.originalCount).toBe(0);
  });

  test('preserves semantic repetition with different casing', () => {
    const items = [makeItem('a', 'Hello World'), makeItem('b', 'hello world')];
    const result = deduplicateContext(items);
    expect(result.applied).toBe(true);
  });
});
