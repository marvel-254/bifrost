import type { StreamKeepaliveConfig, StreamSession } from './types';

const DEFAULT_CONFIG: StreamKeepaliveConfig = {
  idleTimeoutMs: 30000,
  heartbeatIntervalMs: 10000,
  maxStallTimeMs: 60000,
  enabled: true,
};

export class StreamKeepalive {
  private config: StreamKeepaliveConfig;
  private sessions: Map<string, StreamSession> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private heartbeatHandler?: (session: StreamSession) => Promise<void>;
  private failoverHandler?: (session: StreamSession) => Promise<boolean>;

  constructor(config: Partial<StreamKeepaliveConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  onHeartbeat(handler: (session: StreamSession) => Promise<void>): void {
    this.heartbeatHandler = handler;
  }

  onFailover(handler: (session: StreamSession) => Promise<boolean>): void {
    this.failoverHandler = handler;
  }

  createSession(session: Omit<StreamSession, 'id' | 'startedAt' | 'lastChunkAt' | 'heartbeatCount' | 'stallCount' | 'clientConnected' | 'providerConnected'>): StreamSession {
    const id = `stream_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const fullSession: StreamSession = {
      ...session,
      id,
      startedAt: Date.now(),
      lastChunkAt: Date.now(),
      heartbeatCount: 0,
      stallCount: 0,
      clientConnected: true,
      providerConnected: true,
    };
    this.sessions.set(id, fullSession);
    this.startMonitoring(id);
    return fullSession;
  }

  recordChunk(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastChunkAt = Date.now();
      session.stallCount = 0;
    }
  }

  recordClientDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.clientConnected = false;
    }
    this.stopMonitoring(sessionId);
  }

  recordProviderDisconnect(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.providerConnected = false;
    }
    this.stopMonitoring(sessionId);
  }

  private startMonitoring(sessionId: string): void {
    if (!this.config.enabled) return;

    const interval = setInterval(async () => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        this.stopMonitoring(sessionId);
        return;
      }

      const now = Date.now();
      const idleTime = now - session.lastChunkAt;

      if (idleTime > this.config.idleTimeoutMs) {
        session.stallCount++;
        if (session.stallCount > 3 && this.failoverHandler && session.clientConnected) {
          const canFailover = await this.failoverHandler(session);
          if (!canFailover) {
            this.stopMonitoring(sessionId);
          }
        }
      }

      if (idleTime > this.config.heartbeatIntervalMs && session.providerConnected && this.heartbeatHandler) {
        session.heartbeatCount++;
        try {
          await this.heartbeatHandler(session);
          session.lastChunkAt = now;
        } catch {
          session.providerConnected = false;
        }
      }

      if (!session.clientConnected && !session.providerConnected) {
        this.stopMonitoring(sessionId);
      }
    }, 5000);

    this.timers.set(sessionId, interval);
  }

  private stopMonitoring(sessionId: string): void {
    const timer = this.timers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(sessionId);
    }
  }

  closeSession(sessionId: string): void {
    this.stopMonitoring(sessionId);
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): StreamSession | undefined {
    return this.sessions.get(sessionId);
  }

  getActiveSessions(): StreamSession[] {
    return Array.from(this.sessions.values());
  }
}
