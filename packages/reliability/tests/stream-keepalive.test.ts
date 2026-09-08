import { StreamKeepalive } from '../src/stream-keepalive';

describe('StreamKeepalive', () => {
  let keepalive: StreamKeepalive;

  beforeEach(() => {
    keepalive = new StreamKeepalive({
      idleTimeoutMs: 100,
      heartbeatIntervalMs: 50,
      maxStallTimeMs: 300,
      enabled: true,
    });
  });

  afterEach(() => {
    keepalive.closeSession('test');
  });

  test('creates session', () => {
    const session = keepalive.createSession({
      requestId: 'req1',
      provider: 'openai',
      model: 'gpt-4',
    });
    expect(session.id).toBeDefined();
    expect(session.clientConnected).toBe(true);
    expect(session.providerConnected).toBe(true);
  });

  test('records chunk and resets idle timer', async () => {
    const session = keepalive.createSession({
      requestId: 'req1',
      provider: 'openai',
      model: 'gpt-4',
    });
    const before = session.lastChunkAt;
    await new Promise(r => setTimeout(r, 60));
    keepalive.recordChunk(session.id);
    expect(session.lastChunkAt).toBeGreaterThan(before);
  });

  test('records client disconnect', () => {
    const session = keepalive.createSession({
      requestId: 'req1',
      provider: 'openai',
      model: 'gpt-4',
    });
    keepalive.recordClientDisconnect(session.id);
    expect(session.clientConnected).toBe(false);
  });

  test('records provider disconnect', () => {
    const session = keepalive.createSession({
      requestId: 'req1',
      provider: 'openai',
      model: 'gpt-4',
    });
    keepalive.recordProviderDisconnect(session.id);
    expect(session.providerConnected).toBe(false);
  });

  test('getActiveSessions returns active sessions', () => {
    keepalive.createSession({ requestId: 'r1', provider: 'p1', model: 'm1' });
    keepalive.createSession({ requestId: 'r2', provider: 'p2', model: 'm2' });
    const sessions = keepalive.getActiveSessions();
    expect(sessions).toHaveLength(2);
  });

  test('getSession returns session by id', () => {
    const session = keepalive.createSession({ requestId: 'r1', provider: 'p1', model: 'm1' });
    expect(keepalive.getSession(session.id)).toBe(session);
  });
});
