import { BackpressureEngine } from '../src/backpressure';

describe('BackpressureEngine', () => {
  let engine: BackpressureEngine;

  beforeEach(() => {
    engine = new BackpressureEngine({
      defaultPerProvider: 2,
      queueTimeoutMs: 1000,
      adaptiveLatencyThresholdMs: 100,
      adaptiveReductionFactor: 0.5,
    });
  });

  test('acquires slot when capacity available', async () => {
    const release = await engine.acquireSlot('p1', 'normal');
    expect(typeof release).toBe('function');
    release();
  });

  test('queues when capacity exhausted', async () => {
    const r1 = await engine.acquireSlot('p1', 'normal');
    const r2 = await engine.acquireSlot('p1', 'normal');

    const queuePromise = engine.acquireSlot('p1', 'normal');
    expect(engine.getQueueDepth('p1')).toBe(1);

    r2();
    const r3 = await queuePromise;
    r3();
    r1();
  });

  test('getQueueDepth returns correct depth', async () => {
    await engine.acquireSlot('p1', 'normal');
    await engine.acquireSlot('p1', 'normal');
    expect(engine.getQueueDepth('p1')).toBe(0);

    const p = engine.acquireSlot('p1', 'normal');
    expect(engine.getQueueDepth('p1')).toBe(1);
    const r = await p;
    r();
  });

  test('priority ordering in queue', async () => {
    const r1 = await engine.acquireSlot('p1', 'normal');
    const r2 = await engine.acquireSlot('p1', 'normal');

    const critical = engine.acquireSlot('p1', 'critical');
    const low = engine.acquireSlot('p1', 'low');

    expect(engine.getQueueDepth('p1')).toBe(2);

    r2();
    const r3 = await critical;
    r3();
    r1();
    const r4 = await low;
    r4();
  });

  test('configures and enforces rate limit', () => {
    engine.configureRateLimit('p1', 1, 1);
    expect(engine.tryAcquireRateLimit('p1')).toBe(true);
    expect(engine.tryAcquireRateLimit('p1')).toBe(false);
  });

  test('setConcurrency adjusts limit', async () => {
    engine.setConcurrency('p1', 1);
    const r1 = await engine.acquireSlot('p1', 'normal');
    const p2 = engine.acquireSlot('p1', 'normal');
    expect(engine.getQueueDepth('p1')).toBe(1);

    engine.setConcurrency('p1', 2);
    const r2 = await p2;
    r2();
    r1();
  });
});
