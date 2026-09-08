import { CircuitBreaker } from '../src/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({
      failureThreshold: 3,
      timeoutThreshold: 1000,
      recoveryTimeout: 100,
      probeFrequency: 50,
      threshold429: 2,
      threshold5xx: 2,
      thresholdTimeout: 2,
      thresholdConnection: 2,
    });
  });

  test('CLOSED on init', () => {
    const metrics = cb.getMetrics('test');
    expect(metrics.state).toBe('CLOSED');
    expect(metrics.failureCount).toBe(0);
    expect(metrics.successCount).toBe(0);
  });

  test('opens after threshold failures', async () => {
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute('test', async () => {
        throw new Error('server error 500');
      })).rejects.toThrow();
    }
    const metrics = cb.getMetrics('test');
    expect(metrics.state).toBe('OPEN');
    expect(metrics.failureCount).toBe(3);
  });

  test('rejects when OPEN', async () => {
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await expect(cb.execute('test', async () => 'ok')).rejects.toThrow('Circuit breaker OPEN');
  });

  test('transitions to HALF_OPEN after recoveryTimeout', async () => {
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    expect(cb.getMetrics('test').state).toBe('OPEN');

    await new Promise(r => setTimeout(r, 150));
    await expect(cb.execute('test', async () => 'ok')).resolves.toBe('ok');
    expect(cb.getMetrics('test').state).toBe('CLOSED');
  });

  test('success resets failure count in HALF_OPEN', async () => {
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });

    await new Promise(r => setTimeout(r, 150));
    await expect(cb.execute('test', async () => 'ok')).resolves.toBe('ok');
    expect(cb.getMetrics('test').failureCount).toBe(0);
    expect(cb.getMetrics('test').state).toBe('CLOSED');
  });

  test('different keys have independent states', async () => {
    await cb.execute('a', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('a', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('a', async () => {
      throw new Error('server error 500');
    });
    expect(cb.getMetrics('a').state).toBe('OPEN');
    expect(cb.getMetrics('b').state).toBe('CLOSED');
  });

  test('forceClose resets state', async () => {
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    await cb.execute('test', async () => {
      throw new Error('server error 500');
    });
    cb.forceClose('test');
    expect(cb.getMetrics('test').state).toBe('CLOSED');
    expect(cb.getMetrics('test').failureCount).toBe(0);
    await expect(cb.execute('test', async () => 'ok')).resolves.toBe('ok');
  });

  test('separate thresholds for different error types', async () => {
    for (let i = 0; i < 2; i++) {
      await cb.execute('test', async () => {
        const err = new Error('429 rate limit');
        (err as any).status = 429;
        throw err;
      });
    }
    expect(cb.getMetrics('test').state).toBe('OPEN');
  });

  test('tracks success and failure timestamps', async () => {
    const beforeSuccess = Date.now();
    await expect(cb.execute('test', async () => 'ok')).resolves.toBe('ok');
    const afterSuccess = Date.now();

    const metrics = cb.getMetrics('test');
    expect(metrics.lastSuccess).toBeGreaterThanOrEqual(beforeSuccess);
    expect(metrics.lastSuccess).toBeLessThanOrEqual(afterSuccess);
    expect(metrics.lastFailure).toBeNull();

    await cb.execute('test', async () => {
      throw new Error('fail');
    });
    expect(cb.getMetrics('test').lastFailure).toBeDefined();
  });
});
