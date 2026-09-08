'use client';

import { useState, useEffect, useCallback } from 'react';

const API_KEY = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_BIFROST_API_KEY ?? '')
  : '';

type HealthStatus = { status: string; version: string; timestamp: number };
type RequestMetrics = { total_requests: number; success_rate: number; avg_latency_ms: number; estimated_cost_usd: number; active_providers: number };
type ProviderHealth = { provider: string; status: string; success_rate: number; avg_latency_ms: number; model_count: number; last_check: string };

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: { index: number; message: { role: string; content: string }; finish_reason: string | null }[];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

const statusConfig: Record<string, { color: string; label: string }> = {
  ok:       { color: '#22c55e', label: 'Operational' },
  degraded: { color: '#eab308', label: 'Degraded' },
  unhealthy:{ color: '#ef4444', label: 'Unhealthy' },
  healthy:  { color: '#22c55e', label: 'Healthy' },
  error:    { color: '#ef4444', label: 'Error' },
  disabled: { color: '#6b7280', label: 'Disabled' },
};

const providerColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#f97316'];

const seedModels = [
  { id: 'llama3',    label: 'llama3 (Ollama)' },
  { id: 'mistral',   label: 'mistral (Ollama)' },
  { id: 'llama3.1',  label: 'llama3.1 (Ollama)' },
];

function statusBadge(state: string) {
  const cfg = statusConfig[state] ?? { color: '#6b7280', label: state };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 9999,
      fontSize: 11, fontWeight: 600, color: '#fff',
      background: cfg.color, textTransform: 'capitalize',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', opacity: 0.85 }} />
      {cfg.label}
    </span>
  );
}

function statCard({ label, value, suffix, color }: { label: string; value: string | number; suffix?: string; color?: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px', border: '1px solid #334155' }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? '#f1f5f9', lineHeight: 1.2 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
        {suffix && <span style={{ fontSize: 13, color: '#64748b', marginLeft: 3, fontWeight: 500 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function modelRow({ id, owned_by, provider, idx }: { id: string; owned_by: string; provider?: string; idx: number }) {
  const color = providerColors[idx % providerColors.length];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #1e293b' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{id}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{owned_by}</div>
      </div>
      <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{provider ?? 'bifrost'}</div>
    </div>
  );
}

function providerRow({ provider, status, success_rate, avg_latency_ms, model_count, idx }: ProviderHealth & { idx: number }) {
  const color = providerColors[idx % providerColors.length];
  const scfg = statusConfig[status] ?? { color: '#6b7280', label: status };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #1e293b' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 13, textTransform: 'capitalize' }}>{provider}</div>
        <div style={{ fontSize: 11, color: '#64748b' }}>{model_count} model{model_count !== 1 ? 's' : ''}</div>
      </div>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 9999, fontSize: 11, fontWeight: 600, color: '#fff', background: scfg.color, textTransform: 'capitalize', flexShrink: 0 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', opacity: 0.85 }} />
        {scfg.label}
      </span>
      <div style={{ minWidth: 55, textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{Math.round(success_rate * 100)}%</div>
        <div style={{ fontSize: 10, color: '#64748b' }}>success</div>
      </div>
      <div style={{ minWidth: 65, textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9' }}>{Math.round(avg_latency_ms)}<span style={{ fontSize: 10, color: '#64748b', marginLeft: 2 }}>ms</span></div>
        <div style={{ fontSize: 10, color: '#64748b' }}>latency</div>
      </div>
    </div>
  );
}

function spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<RequestMetrics | null>(null);
  const [models, setModels] = useState<{ id: string; object: string; created: number; owned_by: string; provider?: string }[]>([]);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const api = useCallback(async (path: string, method = 'GET', body?: unknown) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body) headers['Content-Type'] = 'application/json';
    if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
    const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text ? `HTTP ${res.status}: ${text?.slice(0, 200)}` : `HTTP ${res.status}`);
    }
    return res.json();
  }, [API_KEY]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, m, mod, p] = await Promise.all([
        api('/api/health'),
        api('/api/health/metrics'),
        api('/api/v1/models'),
        api('/api/health/providers'),
      ]);
      setHealth(h as HealthStatus);
      setMetrics(m as RequestMetrics);
      const data = (m as unknown as { data?: unknown[] }).data;
      setModels(Array.isArray(data) ? (data as { id: string; object: string; created: number; owned_by: string; provider?: string }[]) : []);
      setProviders(p as ProviderHealth[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  const version = health?.version ?? '—';
  const healthState = health?.status ?? 'unknown';
  const hc = statusConfig[healthState] ?? { color: '#6b7280', label: 'Unknown' };
  const avgLatency = metrics?.avg_latency_ms ?? 0;
  const successRate = metrics?.success_rate != null ? Math.round(metrics.success_rate * 100) : 0;
  const cost = metrics?.estimated_cost_usd ?? 0;
  const requests = metrics?.total_requests ?? 0;
  const activeProviders = metrics?.active_providers ?? 0;
  const modelCount = models.length;
  const providerCount = providers.length;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #64748b; }
      `}</style>

      <header style={{ borderBottom: '1px solid #1e293b', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <rect x="2" y="12" width="11" height="8" rx="2" fill="#3b82f6" opacity="0.9" />
              <rect x="8" y="6" width="11" height="8" rx="2" fill="#8b5cf6" opacity="0.9" />
              <rect x="14" y="0" width="11" height="8" rx="2" fill="#06b6d4" opacity="0.9" />
              <rect x="18" y="20" width="11" height="10" rx="2" fill="#10b981" opacity="0.9" />
              <rect x="14" y="14" width="11" height="10" rx="2" fill="#f59e0b" opacity="0.9" />
              <path d="M16 13 L10 24 L22 24 Z" fill="#3b82f6" opacity="0.3" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Bifröst</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>AI Gateway Dashboard</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#1e293b', borderRadius: 8, border: '1px solid #334155' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: hc.color }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: hc.color, textTransform: 'capitalize' }}>{hc.label}</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: 12, color: '#94a3b8', padding: '4px 8px', background: '#1e293b', borderRadius: 6, border: '1px solid #334155' }}>v{version}</div>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid #475569',
                background: loading ? '#334155' : 'transparent',
                color: loading ? '#64748b' : '#e2e8f0',
                fontSize: 12, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {loading && spinner()}
              {loading ? 'Refreshing' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px 48px' }}>
        {error && (
          <div style={{ marginBottom: 20, padding: 14, background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 10, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            {error}
          </div>
        )}

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Total Requests', value: loading ? '—' : requests, suffix: '' },
            { label: 'Success Rate', value: loading ? '—' : successRate, suffix: '%', color: successRate >= 90 ? '#22c55e' : successRate >= 70 ? '#eab308' : '#ef4444' },
            { label: 'Avg Latency', value: loading ? '—' : avgLatency, suffix: 'ms', color: avgLatency < 500 ? '#22c55e' : avgLatency < 2000 ? '#eab308' : '#ef4444' },
            { label: 'Est. Cost', value: loading ? '—' : cost, suffix: 'USD', color: '#3b82f6' },
          ].map((s, i) => (
            <div key={i}>
              {loading ? (
                <div style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px', border: '1px solid #334155' }}>
                  <div style={{ height: 11, width: 70, borderRadius: 4, background: '#334155', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ height: 24, width: 60, borderRadius: 6, background: '#334155', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              ) : (
                statCard(s)
              )}
            </div>
          ))}
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Models <span style={{ color: '#64748b', marginLeft: 6, fontWeight: 400 }}>({modelCount})</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>OpenAI-compatible model registry</span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#334155', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1, height: 12, borderRadius: 4, background: '#1e293b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 55, height: 12, borderRadius: 4, background: '#1e293b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              ))) : modelCount === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No models registered — configure a provider to get started</div>
            ) : (
              models.map((m, i) => modelRow({ id: m.id, owned_by: m.owned_by, provider: m.provider, idx: i }))
            )}
          </div>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Providers <span style={{ color: '#64748b', marginLeft: 6, fontWeight: 400 }}>({providerCount} active)</span>
            </div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Health + latency per provider</span>
          </div>
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #1e293b' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#334155', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ flex: 1, height: 12, borderRadius: 4, background: '#1e293b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 60, height: 12, borderRadius: 4, background: '#1e293b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  <div style={{ width: 50, height: 12, borderRadius: 4, background: '#1e293b', animation: 'pulse 1.5s ease-in-out infinite' }} />
                </div>
              ))) : providerCount === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>No providers configured — add a provider adapter to enable routing</div>
            ) : (
              providers.map((p, i) => providerRow({ ...p, idx: i }))
            )}
          </div>
        </section>

        <section style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Test Request</div>
            <span style={{ fontSize: 11, color: '#64748b' }}>Send a chat completion via the dashboard</span>
          </div>
          <TestPanel />
        </section>
      </main>
    </div>
  );
}

function TestPanel() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    { role: 'user', content: 'What is Bifröst?' },
  ]);
  const [model, setModel] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const apiKey = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_BIFROST_API_KEY ?? '') : '';

  const send = async (stream: boolean) => {
    if (streaming) return;
    if (!model) { setError('Select a model'); return; }
    setStreaming(true);
    setError(null);
    setResponse(null);
    setDone(false);

    try {
      const res = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, messages, stream }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text ? `HTTP ${res.status}: ${text?.slice(0, 300)}` : `HTTP ${res.status}`);
      }

      if (!stream) {
        const json = await res.json() as ChatCompletionResponse;
        setResponse(json.choices[0]?.message?.content ?? '');
        setDone(true);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');
      const decoder = new TextDecoder();
      let buf = '';
      let fullContent = '';
      const contentEl = document.getElementById('stream-output');

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') { setDone(true); continue; }

          try {
            const parsed = JSON.parse(data) as { choices?: { delta?: { content?: string; role?: string }; finish_reason?: string | null }[]; error?: { message: string } };
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              fullContent += delta.content;
              if (contentEl) {
                contentEl.textContent = fullContent;
                contentEl.scrollTop = contentEl.scrollHeight;
              }
            }
            if (parsed.choices?.[0]?.finish_reason) {
              setDone(true);
            }
          } catch {
            // skip malformed SSE
          }
        }
      }

      setResponse(fullContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, flexShrink: 0, minWidth: 50 }}>Model</div>
          <select
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={streaming}
            style={{
              flex: 1, padding: '7px 10px', borderRadius: 8,
              background: '#0f172a', border: '1px solid #334155',
              color: '#e2e8f0', fontSize: 13,
              cursor: streaming ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            <option value="">— select model —</option>
            {seedModels.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Message</div>
          <textarea
            value={messages[messages.length - 1]?.content ?? ''}
            onChange={e => {
              const last = messages[messages.length - 1];
              const updated = [...messages.slice(0, -1), { role: 'user', content: e.target.value }];
              setMessages(updated);
            }}
            disabled={streaming}
            placeholder="Type your message..."
            rows={3}
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              background: '#0f172a', border: '1px solid #334155',
              color: '#e2e8f0', fontSize: 13,
              resize: 'vertical', outline: 'none',
              cursor: streaming ? 'not-allowed' : 'text',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => send(false)}
            disabled={streaming}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: streaming ? '#334155' : '#3b82f6',
              color: streaming ? '#64748b' : '#fff',
              border: 'none', fontSize: 13, fontWeight: 600,
              cursor: streaming ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            {streaming ? 'Sending...' : 'Send (non-streaming)'}
          </button>
          <button
            onClick={() => send(true)}
            disabled={streaming}
            style={{
              padding: '7px 16px', borderRadius: 8,
              background: streaming ? '#334155' : 'transparent',
              color: streaming ? '#64748b' : '#3b82f6',
              border: '1px solid #3b82f6', fontSize: 13, fontWeight: 600,
              cursor: streaming ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {streaming ? 'Streaming...' : 'Stream'}
          </button>
          {!streaming && (
            <button
              onClick={() => { setMessages([{ role: 'user', content: 'What is Bifröst?' }]); setResponse(null); setError(null); setDone(false); }}
              style={{
                padding: '7px 12px', borderRadius: 8,
                background: 'transparent',
                color: '#64748b', border: '1px solid #334155',
                fontSize: 12, cursor: 'pointer',
              }}
            >
              Reset
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginTop: 4, padding: '10px 12px', background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 8, color: '#fca5a5', fontSize: 12 }}>
            {error}
          </div>
        )}

        {response !== null && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, marginBottom: 6 }}>
              Response {done ? <span style={{ color: '#22c55e', marginLeft: 6 }}>✓ complete</span> : <span style={{ color: '#eab308', marginLeft: 6 }}>streaming...</span>}
            </div>
            <div
              id="stream-output"
              style={{
                padding: '12px', borderRadius: 8,
                background: '#0f172a', border: '1px solid #334155',
                color: '#e2e8f0', fontSize: 13, lineHeight: 1.6,
                minHeight: 60, maxHeight: 200, overflowY: 'auto',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}
            >
              {response}
            </div>
          </div>
        )}

        {response === null && !error && (
          <div style={{ padding: '16px 12px', textAlign: 'center', color: '#64748b', fontSize: 13, border: '1px dashed #334155', borderRadius: 8, marginTop: 4 }}>
            Send a message to test an OpenAI-compatible chat completion via Bifröst
          </div>
        )}
      </div>
    </div>
  );
}
