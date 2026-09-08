import { PriorityQueue } from '../src/priority-queue';

describe('PriorityQueue', () => {
  let queue: PriorityQueue;

  beforeEach(() => {
    queue = new PriorityQueue({
      normal: { maxConcurrency: 1, timeoutMs: 5000 },
      high: { maxConcurrency: 1, timeoutMs: 5000 },
    });
  });

  test('enqueues and dequeues in priority order', async () => {
    await queue.enqueue({ id: '1', priority: 'normal', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    await queue.enqueue({ id: '2', priority: 'high', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    await queue.enqueue({ id: '3', priority: 'background', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });

    const first = queue.dequeue('p1');
    expect(first?.priority).toBe('high');

    const second = queue.dequeue('p1');
    expect(second?.priority).toBe('normal');

    const third = queue.dequeue('p1');
    expect(third?.priority).toBe('background');
  });

  test('returns null when no eligible items', () => {
    expect(queue.dequeue('nonexistent')).toBeNull();
  });

  test('getQueueDepth returns correct counts', async () => {
    await queue.enqueue({ id: '1', priority: 'normal', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    expect(queue.getQueueDepth('normal')).toBe(1);
    expect(queue.getTotalDepth()).toBe(1);
  });

  test('complete decrements processing count', async () => {
    const item = await queue.enqueue({ id: '1', priority: 'normal', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    const dequeued = queue.dequeue('p1');
    expect(dequeued).not.toBeNull();
    expect(queue.getProcessingCount('normal')).toBe(1);
    queue.complete('normal');
    expect(queue.getProcessingCount('normal')).toBe(0);
  });

  test('drain clears all queues', async () => {
    await queue.enqueue({ id: '1', priority: 'normal', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    await queue.enqueue({ id: '2', priority: 'high', provider: 'p1', model: 'm1', request: { messages: [] }, enqueuedAt: Date.now(), timeoutAt: Date.now() + 5000 });
    queue.drain();
    expect(queue.getTotalDepth()).toBe(0);
  });
});
