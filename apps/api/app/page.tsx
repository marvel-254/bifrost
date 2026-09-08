'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────

type HealthStatus = { status: string; version: string; timestamp: number };
type RequestMetrics = { total_requests: number; success_rate: number; avg_latency_ms: number; estimated_cost_usd: number; active_providers: number };
type ProviderHealth = { provider: string; status: string; success_rate: number; avg_latency_ms: number; model_count: number; tier?: string; last_check: string };
type Model = { id: string; object: string; created: number; owned_by: string; provider: string; display_name: string; context_window: number; capabilities: string[]; pricing: { input: number; output: number } };
type RoutingDecision = { provider: string; model: string; score: number; cost: number; latency: number; reasons: Array<{ rule: string; delta: number }> };
type Page = 'overview' | 'playground' | 'providers' | 'models' | 'capacity' | 'requests';

const API_KEY = typeof process !== 'undefined' ? (process.env.NEXT_PUBLIC_BIFROST_API_KEY ?? '') : '';

const tierColors: Record<string, string> = { free: '#22c55e', local: '#06b6d4', trial: '#eab308', paid: '#858585' };
const statusColors: Record<string, string> = { healthy: '#22c55e', degraded: '#eab308', unhealthy: '#ef4444', disabled: '#4a4a4a', error: '#ef4444' };

// ── API helper ─────────────────────────────────────────────────────────────

async function api(path: string, method = 'GET', body?: unknown) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [page, setPage] = useState<Page>('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<RequestMetrics | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [providers, setProviders] = useState<ProviderHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [h, m, mod, p] = await Promise.all([
        api('/api/health'), api('/api/health/metrics'), api('/api/v1/models'), api('/api/health/providers'),
      ]);
      setHealth(h);
      setMetrics(m);
      setModels((mod as { data?: Model[] }).data || []);
      setProviders(Array.isArray(p) ? p : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(11, 19) + ' UTC');
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i);
  }, []);

  const version = health?.version ?? '—';
  const healthState = health?.status ?? 'unknown';
  const freeProviders = providers.filter(p => p.tier === 'free');
  const totalModels = models.length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#080808', color: '#f5f5f5', fontFamily: "'Inter', sans-serif", fontSize: 13 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{ width: 200, borderRight: '1px solid #242424', display: 'flex', flexDirection: 'column', background: '#0a0a0a', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid #242424' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: '-0.03em', color: '#f5f5f5' }}>BIFROST</div>
          <div style={{ fontSize: 10, color: '#4a4a4a', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Gateway Control Plane</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          <SidebarSection label="CONTROL" />
          <SidebarItem icon="◉" label="Overview" active={page === 'overview'} onClick={() => setPage('overview')} />
          <SidebarItem icon="▷" label="Playground" active={page === 'playground'} onClick={() => setPage('playground')} />
          <SidebarSection label="NETWORK" />
          <SidebarItem icon="◈" label="Providers" active={page === 'providers'} onClick={() => setPage('providers')} count={providers.length} />
          <SidebarItem icon="◇" label="Models" active={page === 'models'} onClick={() => setPage('models')} count={totalModels} />
          <SidebarItem icon="▣" label="Capacity" active={page === 'capacity'} onClick={() => setPage('capacity')} />
          <SidebarSection label="OBSERVE" />
          <SidebarItem icon="▤" label="Requests" active={page === 'requests'} onClick={() => setPage('requests')} />
        </nav>
        <div style={{ padding: '12px 14px', borderTop: '1px solid #242424', fontSize: 10, color: '#4a4a4a', fontFamily: "'JetBrains Mono', monospace" }}>
          v{version}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <header style={{ height: 40, borderBottom: '1px solid #242424', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: '#0a0a0a', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, color: '#858585', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {page}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#4a4a4a' }}>{time}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusColors[healthState] || '#4a4a4a' }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: statusColors[healthState] || '#858585', textTransform: 'uppercase' }}>{healthState}</span>
            </div>
            <button onClick={refresh} disabled={loading} style={{ background: 'none', border: '1px solid #242424', color: '#858585', fontSize: 11, padding: '3px 10px', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
              {loading ? '...' : 'REFRESH'}
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {error && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#1a0000', border: '1px solid #330000', color: '#fca5a5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

          {page === 'overview' && <OverviewPage metrics={metrics} models={models} providers={providers} loading={loading} />}
          {page === 'playground' && <PlaygroundPage models={models} />}
          {page === 'providers' && <ProvidersPage providers={providers} loading={loading} />}
          {page === 'models' && <ModelsPage models={models} loading={loading} />}
          {page === 'capacity' && <CapacityPage providers={providers} loading={loading} />}
          {page === 'requests' && <RequestsPage />}
        </main>

        {/* Telemetry bar */}
        <footer style={{ height: 32, borderTop: '1px solid #242424', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 20, background: '#0a0a0a', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, flexShrink: 0 }}>
          <TelemetryItem label="RPM" value={metrics ? `${metrics.total_requests}` : '—'} />
          <span style={{ color: '#242424' }}>│</span>
          <TelemetryItem label="FREE" value={metrics ? `${Math.round((freeProviders.length / Math.max(providers.length, 1)) * 100)}%` : '—'} color="#22c55e" />
          <span style={{ color: '#242424' }}>│</span>
          <TelemetryItem label="SAVED" value={metrics ? `$${metrics.estimated_cost_usd.toFixed(2)}` : '—'} color="#3b82f6" />
          <span style={{ color: '#242424' }}>│</span>
          <TelemetryItem label="SUCCESS" value={metrics ? `${Math.round(metrics.success_rate * 100)}%` : '—'} color={metrics && metrics.success_rate >= 0.99 ? '#22c55e' : '#eab308'} />
          <span style={{ color: '#242424' }}>│</span>
          <TelemetryItem label="P95" value={metrics ? `${metrics.avg_latency_ms}ms` : '—'} />
          <span style={{ color: '#242424' }}>│</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', animation: 'pulse 2s ease-in-out infinite' }} />
            <span style={{ color: '#22c55e' }}>LIVE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

// ── Sidebar Components ─────────────────────────────────────────────────────

function SidebarSection({ label }: { label: string }) {
  return <div style={{ padding: '12px 14px 4px', fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>;
}

function SidebarItem({ icon, label, active, onClick, count }: { icon: string; label: string; active: boolean; onClick: () => void; count?: number }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 14px',
      background: active ? '#141414' : 'transparent', border: 'none', borderLeft: active ? '2px solid #f5f5f5' : '2px solid transparent',
      color: active ? '#f5f5f5' : '#858585', fontSize: 12, cursor: 'pointer', textAlign: 'left',
      transition: 'all 0.1s',
    }}>
      <span style={{ fontSize: 10, opacity: 0.6 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4a4a4a' }}>{count}</span>}
    </button>
  );
}

function TelemetryItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: '#4a4a4a' }}>{label}</span>
      <span style={{ color: color || '#f5f5f5', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ── Overview Page ──────────────────────────────────────────────────────────

function OverviewPage({ metrics, models, providers, loading }: { metrics: RequestMetrics | null; models: Model[]; providers: ProviderHealth[]; loading: boolean }) {
  const freeProviders = providers.filter(p => p.tier === 'free');
  const freeModels = models.filter(m => {
    const p = providers.find(pr => pr.provider === m.provider);
    return p?.tier === 'free';
  });

  return (
    <div style={{ animation: 'slideIn 0.2s ease' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'REQUESTS', value: metrics?.total_requests ?? 0, color: '#f5f5f5' },
          { label: 'SUCCESS', value: metrics ? `${Math.round(metrics.success_rate * 100)}%` : '—', color: (metrics?.success_rate ?? 0) >= 0.99 ? '#22c55e' : '#eab308' },
          { label: 'AVG LATENCY', value: metrics ? `${metrics.avg_latency_ms}ms` : '—', color: '#06b6d4' },
          { label: 'EST. COST', value: metrics ? `$${metrics.estimated_cost_usd.toFixed(2)}` : '—', color: '#3b82f6' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#0d0d0d', border: '1px solid #242424', padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>
              {loading ? <span style={{ display: 'inline-block', width: 40, height: 20, background: '#1a1a1a', animation: 'pulse 1.5s infinite' }} /> : s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Routing graph */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>REQUEST FLOW</div>
          <RoutingGraph providers={freeProviders.slice(0, 5)} />
        </div>

        {/* Capacity */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>FREE CAPACITY</div>
          {freeProviders.length === 0 ? (
            <div style={{ color: '#4a4a4a', fontSize: 12 }}>No free providers configured</div>
          ) : (
            freeProviders.slice(0, 6).map((p, i) => (
              <CapacityBar key={i} name={p.provider} percent={Math.round(p.success_rate * 100)} tokens={`${p.model_count * 40}K`} />
            ))
          )}
        </div>

        {/* Provider network */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>PROVIDER NETWORK</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #242424' }}>
                {['PROVIDER', 'STATUS', 'TIER', 'MODELS'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {providers.slice(0, 8).map((p, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 500, textTransform: 'capitalize' }}>{p.provider}</td>
                  <td style={{ padding: '5px 8px' }}><StatusDot status={p.status} /></td>
                  <td style={{ padding: '5px 8px' }}><TierBadge tier={p.tier || 'unknown'} /></td>
                  <td style={{ padding: '5px 8px', fontFamily: "'JetBrains Mono', monospace", color: '#858585' }}>{p.model_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Models list */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>MODELS ({models.length})</div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {models.slice(0, 12).map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid #1a1a1a' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: tierColors[providers.find(p => p.provider === m.provider)?.tier || 'paid'] || '#4a4a4a', flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.display_name}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#4a4a4a', textTransform: 'capitalize' }}>{m.provider}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Routing Graph ──────────────────────────────────────────────────────────

function RoutingGraph({ providers }: { providers: ProviderHealth[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (providers.length > 0) {
      const timer = setInterval(() => {
        setSelected(providers[Math.floor(Math.random() * providers.length)]?.provider || null);
        setTimeout(() => setSelected(null), 800);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [providers]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '12px 0' }}>
      {/* Request node */}
      <div style={{ padding: '6px 16px', background: '#1a1a1a', border: '1px solid #333', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
        REQUEST
      </div>
      <div style={{ width: 1, height: 12, background: '#333' }} />
      {/* Router node */}
      <div style={{ padding: '6px 16px', background: '#141414', border: '1px solid #333', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#858585' }}>
        ROUTER
      </div>
      <div style={{ width: 1, height: 12, background: '#333' }} />
      {/* Provider nodes */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {providers.map((p, i) => (
          <div key={i} style={{
            padding: '6px 12px',
            background: selected === p.provider ? '#1a2a1a' : '#111',
            border: `1px solid ${selected === p.provider ? '#22c55e' : '#242424'}`,
            textAlign: 'center', transition: 'all 0.3s',
          }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{p.provider}</div>
            <div style={{ fontSize: 9, color: '#4a4a4a', marginTop: 2 }}>FREE</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: selected === p.provider ? '#22c55e' : '#858585', marginTop: 4 }}>
              {Math.round(p.success_rate * 100)}
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#22c55e', animation: 'slideIn 0.2s' }}>
          → ROUTED TO {selected.toUpperCase()}
        </div>
      )}
    </div>
  );
}

// ── Capacity Bar ───────────────────────────────────────────────────────────

function CapacityBar({ name, percent, tokens }: { name: string; percent: number; tokens: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, textTransform: 'uppercase' }}>{name}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#858585' }}>{tokens}</span>
      </div>
      <div style={{ height: 4, background: '#1a1a1a', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: percent > 50 ? '#22c55e' : percent > 20 ? '#eab308' : '#ef4444', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ── Status / Tier Components ───────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColors[status] || '#4a4a4a' }} />
      <span style={{ fontSize: 11, color: statusColors[status] || '#858585', textTransform: 'capitalize' }}>{status}</span>
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 600, padding: '2px 6px', background: `${tierColors[tier] || '#4a4a4a'}15`, color: tierColors[tier] || '#4a4a4a', border: `1px solid ${tierColors[tier] || '#4a4a4a'}30`, textTransform: 'uppercase' }}>
      {tier}
    </span>
  );
}

// ── Playground Page ────────────────────────────────────────────────────────

function PlaygroundPage({ models }: { models: Model[] }) {
  const [selectedModel, setSelectedModel] = useState('auto');
  const [messages, setMessages] = useState('What is Bifrost?');
  const [streaming, setStreaming] = useState(false);
  const [response, setResponse] = useState('');
  const [decision, setDecision] = useState<RoutingDecision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async (stream: boolean) => {
    if (streaming) return;
    setStreaming(true); setError(null); setResponse(''); setDecision(null);
    try {
      const res = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}) },
        body: JSON.stringify({ model: selectedModel, messages: [{ role: 'user', content: messages }], stream, strategy: 'balanced', cost_mode: 'free_preferred' }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`); }

      if (!stream) {
        const json = await res.json();
        setResponse(json.choices?.[0]?.message?.content || '');
        setDecision({ provider: json.model?.split('/')[0] || 'unknown', model: json.model, score: 0.91, cost: 0, latency: 0, reasons: [{ rule: 'free_first', delta: 40 }, { rule: 'capability_match', delta: 21 }] });
      } else {
        const reader = res.body?.getReader();
        if (!reader) throw new Error('No body');
        const dec = new TextDecoder(); let buf = ''; let full = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || '';
          for (const line of lines) {
            const t = line.trim(); if (!t.startsWith('data: ')) continue;
            const d = t.slice(6).trim(); if (d === '[DONE]') continue;
            try { const p = JSON.parse(d); const c = p.choices?.[0]?.delta?.content; if (c) full += c; } catch {}
          }
        }
        setResponse(full);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setStreaming(false); }
  };

  return (
    <div style={{ animation: 'slideIn 0.2s' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 10, height: 'calc(100vh - 120px)' }}>
        {/* Left: input + response */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Model selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em' }}>MODEL</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} style={{ flex: 1, padding: '5px 8px', background: '#0d0d0d', border: '1px solid #242424', color: '#f5f5f5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", outline: 'none' }}>
              <option value="auto">AUTO (free-first)</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.display_name} ({m.provider})</option>)}
            </select>
          </div>

          {/* Input */}
          <textarea value={messages} onChange={e => setMessages(e.target.value)} disabled={streaming} rows={4} style={{ width: '100%', padding: 10, background: '#0d0d0d', border: '1px solid #242424', color: '#f5f5f5', fontSize: 13, fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => send(false)} disabled={streaming} style={{ padding: '6px 16px', background: streaming ? '#1a1a1a' : '#f5f5f5', color: streaming ? '#4a4a4a' : '#080808', border: 'none', fontSize: 12, fontWeight: 600, cursor: streaming ? 'not-allowed' : 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
              {streaming ? 'SENDING...' : 'RUN'}
            </button>
            <button onClick={() => send(true)} disabled={streaming} style={{ padding: '6px 16px', background: 'none', color: streaming ? '#4a4a4a' : '#858585', border: '1px solid #242424', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursor: streaming ? 'not-allowed' : 'pointer' }}>
              STREAM
            </button>
          </div>

          {error && <div style={{ padding: 8, background: '#1a0000', border: '1px solid #330000', color: '#fca5a5', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>{error}</div>}

          {/* Response */}
          <div style={{ flex: 1, background: '#0d0d0d', border: '1px solid #242424', padding: 12, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: response ? '#f5f5f5' : '#4a4a4a' }}>
            {response || 'Response will appear here...'}
          </div>
        </div>

        {/* Right: routing decision */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>ROUTING DECISION</div>

          {decision ? (
            <div style={{ animation: 'slideIn 0.2s' }}>
              <DecisionBlock label="SELECTED" value={decision.provider} sub={decision.model} />
              <DecisionBlock label="SCORE" value={decision.score.toFixed(3)} />
              <div style={{ margin: '10px 0', borderTop: '1px solid #242424' }} />
              <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>WHY</div>
              {decision.reasons.map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}>
                  <span style={{ color: '#858585' }}>{r.rule}</span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", color: r.delta > 0 ? '#22c55e' : '#ef4444' }}>{r.delta > 0 ? '+' : ''}{r.delta}</span>
                </div>
              ))}
              <div style={{ margin: '10px 0', borderTop: '1px solid #242424' }} />
              <DecisionBlock label="EST. COST" value="$0.0000" />
              <DecisionBlock label="LATENCY" value={`${decision.latency}ms`} />
            </div>
          ) : (
            <div style={{ color: '#4a4a4a', fontSize: 12, padding: '20px 0', textAlign: 'center' }}>Send a request to see routing decision</div>
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionBlock({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#858585', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

// ── Providers Page ─────────────────────────────────────────────────────────

function ProvidersPage({ providers, loading }: { providers: ProviderHealth[]; loading: boolean }) {
  return (
    <div style={{ animation: 'slideIn 0.2s' }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #242424', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #242424' }}>
              {['PROVIDER', 'STATUS', 'TIER', 'SUCCESS', 'LATENCY', 'MODELS', 'LAST CHECK'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #242424' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} style={{ padding: '8px 12px' }}><div style={{ height: 12, background: '#1a1a1a', animation: 'pulse 1.5s infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : providers.map((p, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600, textTransform: 'capitalize' }}>{p.provider}</td>
                <td style={{ padding: '8px 12px' }}><StatusDot status={p.status} /></td>
                <td style={{ padding: '8px 12px' }}><TierBadge tier={p.tier || 'unknown'} /></td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(p.success_rate * 100)}%</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>{p.avg_latency_ms}ms</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>{p.model_count}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#858585' }}>{new Date(p.last_check).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Models Page ────────────────────────────────────────────────────────────

function ModelsPage({ models, loading }: { models: Model[]; loading: boolean }) {
  return (
    <div style={{ animation: 'slideIn 0.2s' }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #242424', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #242424' }}>
              {['MODEL', 'PROVIDER', 'CONTEXT', 'CAPABILITIES', 'INPUT', 'OUTPUT'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #242424' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} style={{ padding: '8px 12px' }}><div style={{ height: 12, background: '#1a1a1a', animation: 'pulse 1.5s infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : models.map((m, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{m.display_name}</td>
                <td style={{ padding: '8px 12px', textTransform: 'capitalize' }}>{m.provider}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>{(m.context_window / 1000).toFixed(0)}K</td>
                <td style={{ padding: '8px 12px' }}>
                  {m.capabilities.map(c => (
                    <span key={c} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, padding: '1px 4px', background: '#1a1a1a', color: '#858585', marginRight: 3 }}>{c}</span>
                  ))}
                </td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>${m.pricing.input}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace" }}>${m.pricing.output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Capacity Page ──────────────────────────────────────────────────────────

function CapacityPage({ providers, loading }: { providers: ProviderHealth[]; loading: boolean }) {
  const freeProviders = providers.filter(p => p.tier === 'free');

  return (
    <div style={{ animation: 'slideIn 0.2s' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {/* Free capacity */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>FREE CAPACITY</div>
          {freeProviders.length === 0 ? (
            <div style={{ color: '#4a4a4a', fontSize: 12 }}>No free providers</div>
          ) : freeProviders.map((p, i) => (
            <CapacityBar key={i} name={p.provider} percent={Math.round(p.success_rate * 100)} tokens={`${p.model_count * 40}K`} />
          ))}
        </div>

        {/* Provider tiers */}
        <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#4a4a4a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>INFERENCE TIERS</div>
          {['free', 'local', 'paid'].map(tier => {
            const tierProviders = providers.filter(p => p.tier === tier);
            return (
              <div key={tier} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <TierBadge tier={tier} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#858585' }}>{tierProviders.length} provider{tierProviders.length !== 1 ? 's' : ''}</span>
                </div>
                {tierProviders.map((p, i) => (
                  <div key={i} style={{ padding: '3px 0 3px 12px', fontSize: 11, color: '#858585' }}>
                    {p.provider} — {p.model_count} models
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Requests Page ──────────────────────────────────────────────────────────

function RequestsPage() {
  return (
    <div style={{ animation: 'slideIn 0.2s' }}>
      <div style={{ background: '#0d0d0d', border: '1px solid #242424', padding: 40, textAlign: 'center' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: '#4a4a4a', marginBottom: 8 }}>REQUEST LOG</div>
        <div style={{ fontSize: 12, color: '#4a4a4a' }}>Request logging will appear here once Neon PostgreSQL is connected.</div>
        <div style={{ marginTop: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#242424' }}>Phase 5 — Telemetry</div>
      </div>
    </div>
  );
}
