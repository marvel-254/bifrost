import { pruneContext } from '../src/prune';
import type { ContextItem } from '../src/types';

describe('pruneContext', () => {
  function makeItem(id: string, opts: Partial<ContextItem> = {}): ContextItem {
    return {
      id,
      type: 'user',
      content: 'content',
      tokens: 10,
      age: 1000,
      referenced: true,
      priority: 5,
      dependencies: [],
      ...opts,
    };
  }

  test('never removes referenced items', () => {
    const items = [makeItem('a', { referenced: true, priority: 1 })];
    const result = pruneContext(items);
    expect(result.removedIds).not.toContain('a');
  });

  test('never removes system instructions', () => {
    const items = [makeItem('a', { type: 'system', referenced: false })];
    const result = pruneContext(items);
    expect(result.removedIds).not.toContain('a');
  });

  test('removes low-priority items first', () => {
    const items = [
      makeItem('a', { referenced: false, priority: 10, age: 1000 }),
      makeItem('b', { referenced: false, priority: 1, age: 1000 }),
    ];
    const result = pruneContext(items);
    expect(result.removedIds).toContain('a');
  });

  test('reports MEDIUM confidence', () => {
    const items = [makeItem('a', { referenced: false, priority: 10 })];
    const result = pruneContext(items);
    expect(result.confidence).toBe('MEDIUM');
  });

  test('handles empty array', () => {
    const result = pruneContext([]);
    expect(result.applied).toBe(false);
  });
});
