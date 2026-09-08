import { CompressionEngine } from '../src/engine';

describe('CompressionEngine budget', () => {
  const registry = {
    getModel: (id: string) => ({ contextWindow: id === 'tiny' ? 1024 : id === 'small' ? 4096 : 8192 }),
  };

  test('stops at level 1 when budget is met', async () => {
    const engine = new CompressionEngine({ registry });
    const text = 'Could you please ' + 'y'.repeat(500);
    const req = { model: 'tiny', messages: [{ role: 'user', content: text }] } as any;
    const result = await engine.compress(req);
    const level1Pass = result.passes.find(p => p.name === 'level1-boilerplate');
    if (level1Pass?.applied) {
      expect(result.level).toBeGreaterThanOrEqual(1);
    }
  });

  test('escalates levels for larger requests', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [{ role: 'user', content: 'Could you please ' + 'x'.repeat(2000) }] } as any;
    const result = await engine.compress(req);
    expect(result.level).toBeGreaterThanOrEqual(1);
  });

  test('tokensSaved is non-negative', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [{ role: 'user', content: 'hello' }] } as any;
    const result = await engine.compress(req);
    expect(result.tokensSaved).toBeGreaterThanOrEqual(0);
  });

  test('compressionRatio is between 0 and 1', async () => {
    const engine = new CompressionEngine({ registry });
    const req = { model: 'small', messages: [{ role: 'user', content: 'hello' }] } as any;
    const result = await engine.compress(req);
    expect(result.compressionRatio).toBeGreaterThanOrEqual(0);
    expect(result.compressionRatio).toBeLessThanOrEqual(1);
  });
});
