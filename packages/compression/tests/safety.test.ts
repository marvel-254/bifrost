import { CompressionEngine } from '../src/engine';

describe('CompressionEngine safety', () => {
  const registry = {
    getModel: (id: string) => ({ contextWindow: id === 'small' ? 4096 : id === 'medium' ? 8192 : 32768 }),
  };

  test('preserves original when uncertainty is above threshold', async () => {
    const engine = new CompressionEngine(
      { registry },
      { minConfidence: 'HIGH' },
    );
    const req = {
      model: 'small',
      messages: [{ role: 'user', content: 'unknown prompt that does not match anything' }],
    } as any;
    const result = await engine.compress(req);
    expect(result.optimizedRequest).toEqual(req);
  });

  test('never returns null or undefined request', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [] } as any;
    const result = await engine.compress(req);
    expect(result.optimizedRequest).toBeDefined();
  });

  test('handles empty messages gracefully', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [] } as any;
    const result = await engine.compress(req);
    expect(result.level).toBe(0);
  });

  test('handles very long single message', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [{ role: 'user', content: 'x'.repeat(5000) }] } as any;
    const result = await engine.compress(req);
    expect(result.level).toBeGreaterThanOrEqual(0);
    expect(result.level).toBeLessThanOrEqual(5);
  });
});
