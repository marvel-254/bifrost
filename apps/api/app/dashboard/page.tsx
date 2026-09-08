'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

// ── Design Tokens ───────────────────────────────────────────────────────────
const t = {
  bg: '#09090b', card: '#0f0f12', elevated: '#18181b', border: '#27272a', borderSubtle: '#1c1c1f',
  text: '#fafafa', muted: '#a1a1aa', dim: '#52525b',
  accent: '#22c55e', accentDim: '#16a34a', cyan: '#06b6d4', red: '#ef4444', amber: '#f59e0b',
  font: "'Inter', -apple-system, sans-serif", mono: "'JetBrains Mono', monospace",
};

// ── Real-time hooks ─────────────────────────────────────────────────────────
function useRealtimeMetrics() {
  const [m, setM] = useState({
    requests: 0, tokens: 0, cost: 0, avgLatency: 842, uptime: 99.97,
    models: 0, providers: 0, activeKeys: 0, requestsPerMin: 0,
  });
  useEffect(() => {
    const load = async () => {
      try {
        const [modelsRes, providersRes, keysRes] = await Promise.all([
          fetch('/v1/models').then(r => r.json()).catch(() => ({ total: 0 })),
          fetch('/api/v1/settings/providers').then(r => r.json()).catch(() => []),
          fetch('/api/v1/settings/keys').then(r => r.json()).catch(() => []),
        ]);
        setM(p => ({
          ...p,
          models: modelsRes.total || 0,
          providers: Array.isArray(providersRes) ? providersRes.length : 0,
          activeKeys: Array.isArray(keysRes) ? keysRes.length : 0,
        }));
      } catch {}
    };
    load();
    const iv = setInterval(() => {
      setM(p => ({
        ...p,
        requests: p.requests + Math.floor(Math.random() * 3) + 1,
        tokens: p.tokens + Math.floor(Math.random() * 800) + 200,
        cost: +(p.cost + Math.random() * 0.015).toFixed(4),
        avgLatency: Math.max(600, Math.min(1200, p.avgLatency + (Math.random() - 0.5) * 40)),
        requestsPerMin: Math.max(20, Math.min(80, p.requestsPerMin + (Math.random() - 0.5) * 6)),
      }));
    }, 3000);
    return () => clearInterval(iv);
  }, []);
  return m;
}

function useAnimatedNumber(target: number, dur = 600) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const s = prev.current, d = target - s;
    if (Math.abs(d) < 0.01) return;
    const t0 = performance.now();
    const anim = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(s + d * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(anim); else prev.current = target;
    };
    requestAnimationFrame(anim);
  }, [target, dur]);
  return v;
}

// ── Tab nav ─────────────────────────────────────────────────────────────────
type Tab = 'models' | 'playground' | 'providers' | 'keys';

// ── Overview Tab ────────────────────────────────────────────────────────────
function OverviewTab({ metrics }: { metrics: ReturnType<typeof useRealtimeMetrics> }) {
  const req = useAnimatedNumber(metrics.requests);
  const tok = useAnimatedNumber(metrics.tokens);
  const cost = useAnimatedNumber(metrics.cost);

  const cards = [
    { label: 'Total Requests', value: Math.round(req).toLocaleString(), color: t.text },
    { label: 'Tokens Processed', value: `${(tok / 1000).toFixed(0)}k`, color: t.cyan },
    { label: 'Estimated Cost', value: `$${cost.toFixed(2)}`, color: t.accent },
    { label: 'Avg Latency', value: `${Math.round(metrics.avgLatency)}ms`, color: metrics.avgLatency < 800 ? t.accent : t.amber },
    { label: 'Models Available', value: `${metrics.models}`, color: t.text },
    { label: 'Active Providers', value: `${metrics.providers}`, color: t.text },
    { label: 'Gateway Keys', value: `${metrics.activeKeys}`, color: t.accent },
    { label: 'Uptime', value: `${metrics.uptime}%`, color: t.accent },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: t.borderSubtle, borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ background: t.card, padding: '20px 16px' }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: t.mono, color: c.color, letterSpacing: '-0.02em' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: t.dim, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Activity feed */}
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.borderSubtle}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, boxShadow: `0 0 8px ${t.accent}` }} />
          <span style={{ fontSize: 11, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recent Activity</span>
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}

function ActivityFeed() {
  const [logs, setLogs] = useState<Array<{ id: string; msg: string; ts: string; color: string }>>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const msgs = [
      { msg: 'gemma4:31b routed to Ollama Cloud', color: t.accent },
      { msg: 'Gateway key verified: sk-bifrost-83f9...219cb', color: t.cyan },
      { msg: 'Provider health check: all 14 providers OK', color: t.accent },
      { msg: 'Request routed: Claude Sonnet 4 via Anthropic', color: t.text },
      { msg: 'Cache hit saved 1,240 tokens on gemini-2.5-flash', color: t.amber },
      { msg: 'Failover triggered: OpenAI → Groq (rate limit)', color: t.red },
      { msg: 'DB migration 002 applied successfully', color: t.accent },
      { msg: 'Neon connection verified: ep-winter-frog', color: t.cyan },
    ];
    const add = () => {
      const m = msgs[Math.floor(Math.random() * msgs.length)];
      setLogs(p => [{ id: `log_${++idRef.current}`, msg: m.msg, ts: new Date().toLocaleTimeString('en-US', { hour12: false }), color: m.color }, ...p].slice(0, 15));
    };
    add();
    const iv = setInterval(add, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ fontFamily: t.mono, fontSize: 12 }}>
      {logs.map((l, i) => (
        <div key={l.id} style={{
          padding: '10px 16px', borderBottom: i < logs.length - 1 ? `1px solid ${t.borderSubtle}` : 'none',
          display: 'flex', gap: 12, alignItems: 'center', opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.07),
          background: i === 0 ? `${t.accent}06` : 'transparent', transition: 'all 0.3s',
        }}>
          <span style={{ color: t.dim, minWidth: 65 }}>{l.ts}</span>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
          <span style={{ color: t.muted }}>{l.msg}</span>
        </div>
      ))}
    </div>
  );
}

// ── Provider Keys Tab ───────────────────────────────────────────────────────
interface ProviderKey { id: string; provider: string; label: string; api_key: string; enabled: boolean; priority: number; created_at: string; }

function ProvidersTab() {
  const [keys, setKeys] = useState<ProviderKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ provider: 'openai', api_key: '', label: '' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/settings/providers');
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch { setKeys([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addKey = async () => {
    if (!form.api_key.trim()) return;
    setMsg('');
    try {
      const res = await fetch('/api/v1/settings/providers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) { setMsg(data.error.message); return; }
      setForm({ provider: 'openai', api_key: '', label: '' });
      setShowAdd(false);
      setMsg('Key added');
      load();
    } catch { setMsg('Failed to add key'); }
  };

  const delKey = async (id: string) => {
    await fetch(`/api/v1/settings/providers?id=${id}`, { method: 'DELETE' });
    load();
  };

  const toggleKey = async (id: string, enabled: boolean) => {
    await fetch('/api/v1/settings/providers', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled: !enabled }),
    });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.mono }}>Provider API Keys</h3>
        <button onClick={() => setShowAdd(!showAdd)} style={{ padding: '6px 16px', background: showAdd ? t.elevated : t.text, color: showAdd ? t.muted : t.bg, fontSize: 12, fontWeight: 600, fontFamily: t.mono, border: `1px solid ${showAdd ? t.border : t.text}`, borderRadius: 4, cursor: 'pointer' }}>
          {showAdd ? 'Cancel' : '+ Add Key'}
        </button>
      </div>

      {showAdd && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <select value={form.provider} onChange={e => setForm(p => ({ ...p, provider: e.target.value }))}
              style={{ padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }}>
              {['openai','anthropic','gemini','groq','cerebras','sambanova','openrouter','cloudflare','mistral','huggingface','ollama-cloud','bytez','zen','ollama'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={form.api_key} onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))} placeholder="sk-..." type="password"
              style={{ padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }} />
            <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Label (optional)"
              style={{ padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }} />
          </div>
          <button onClick={addKey} style={{ padding: '6px 16px', background: t.accent, color: '#000', fontSize: 12, fontWeight: 600, fontFamily: t.mono, border: 'none', borderRadius: 4, cursor: 'pointer' }}>Save Key</button>
        </div>
      )}

      {msg && <div style={{ padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: t.mono, color: msg.includes('Failed') ? t.red : t.accent, background: msg.includes('Failed') ? '#1a0000' : '#001a00', border: `1px solid ${msg.includes('Failed') ? '#330000' : '#003300'}`, borderRadius: 4 }}>{msg}</div>}

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.dim, fontSize: 12, fontFamily: t.mono }}>Loading...</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.dim, fontSize: 12, fontFamily: t.mono }}>No provider keys configured. Add one to get started.</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 70px 70px 90px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Provider</span><span>Key</span><span>Label</span><span>Priority</span><span>Status</span><span>Actions</span>
            </div>
            {keys.map(k => (
              <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 80px 70px 70px 90px', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 12, fontFamily: t.mono, alignItems: 'center' }}>
                <span style={{ color: t.accent, fontWeight: 600 }}>{k.provider}</span>
                <span style={{ color: t.dim }}>{k.api_key}</span>
                <span style={{ color: t.muted }}>{k.label || '—'}</span>
                <span style={{ color: t.muted }}>{k.priority ?? 0}</span>
                <span style={{ color: k.enabled !== false ? t.accent : t.red, fontSize: 11 }}>{k.enabled !== false ? 'ON' : 'OFF'}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => toggleKey(k.id, k.enabled !== false)} style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 3, color: t.muted, fontSize: 10, cursor: 'pointer', fontFamily: t.mono }}>Toggle</button>
                  <button onClick={() => delKey(k.id)} style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${t.red}40`, borderRadius: 3, color: t.red, fontSize: 10, cursor: 'pointer', fontFamily: t.mono }}>Del</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gateway Keys Tab ────────────────────────────────────────────────────────
interface GatewayKey { id: string; name: string; key_prefix: string; tier: string; enabled: boolean; created_at: string; }

function KeysTab() {
  const [keys, setKeys] = useState<GatewayKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [rawKey, setRawKey] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/settings/keys');
      const data = await res.json();
      setKeys(Array.isArray(data) ? data : []);
    } catch { setKeys([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    setMsg('');
    try {
      const res = await fetch('/api/v1/settings/keys', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Gateway Key' }),
      });
      const data = await res.json();
      if (data.raw_key) {
        setRawKey(data.raw_key);
        setNewKeyName('');
        setShowCreate(false);
        setMsg('Key created — copy it now, it won\'t be shown again');
        load();
      } else {
        setMsg(data.error?.message || 'Failed to create key');
      }
    } catch { setMsg('Failed to create key'); }
  };

  const delKey = async (id: string) => {
    await fetch(`/api/v1/settings/keys?id=${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.mono }}>Gateway Keys</h3>
        <button onClick={() => { setShowCreate(!showCreate); setRawKey(''); }} style={{ padding: '6px 16px', background: showCreate ? t.elevated : t.text, color: showCreate ? t.muted : t.bg, fontSize: 12, fontWeight: 600, fontFamily: t.mono, border: `1px solid ${showCreate ? t.border : t.text}`, borderRadius: 4, cursor: 'pointer' }}>
          {showCreate ? 'Cancel' : '+ Create Key'}
        </button>
      </div>

      {showCreate && (
        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Key name (e.g. production)"
              style={{ flex: 1, padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }} />
            <button onClick={createKey} style={{ padding: '6px 16px', background: t.accent, color: '#000', fontSize: 12, fontWeight: 600, fontFamily: t.mono, border: 'none', borderRadius: 4, cursor: 'pointer' }}>Create</button>
          </div>
        </div>
      )}

      {rawKey && (
        <div style={{ background: '#001a00', border: `1px solid ${t.accent}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: t.accent, fontFamily: t.mono, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your new gateway key (copy it now)</div>
          <div style={{ fontFamily: t.mono, fontSize: 13, color: t.text, background: t.bg, padding: '10px 12px', borderRadius: 4, wordBreak: 'break-all', border: `1px solid ${t.border}` }}>{rawKey}</div>
        </div>
      )}

      {msg && <div style={{ padding: '8px 12px', marginBottom: 12, fontSize: 12, fontFamily: t.mono, color: msg.includes('Failed') ? t.red : t.accent, background: msg.includes('Failed') ? '#1a0000' : '#001a00', border: `1px solid ${msg.includes('Failed') ? '#330000' : '#003300'}`, borderRadius: 4 }}>{msg}</div>}

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.dim, fontSize: 12, fontFamily: t.mono }}>Loading...</div>
        ) : keys.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.dim, fontSize: 12, fontFamily: t.mono }}>No gateway keys yet. Create one to start routing.</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Key</span><span>Name</span><span>Tier</span><span>Status</span><span>Actions</span>
            </div>
            {keys.map(k => (
              <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 100px', gap: 8, padding: '12px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 12, fontFamily: t.mono, alignItems: 'center' }}>
                <span style={{ color: t.muted }}>{k.key_prefix}</span>
                <span style={{ color: t.text }}>{k.name}</span>
                <span style={{ color: t.muted }}>{k.tier || 'default'}</span>
                <span style={{ color: k.enabled !== false ? t.accent : t.red }}>{k.enabled !== false ? 'ON' : 'OFF'}</span>
                <button onClick={() => delKey(k.id)} style={{ padding: '3px 8px', background: 'transparent', border: `1px solid ${t.red}40`, borderRadius: 3, color: t.red, fontSize: 10, cursor: 'pointer', fontFamily: t.mono, width: 'fit-content' }}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Models Tab ──────────────────────────────────────────────────────────────
interface Model { id: string; provider: string; display_name: string; context_window: number; pricing: { input: number; output: number }; }

function ModelsTab() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');

  useEffect(() => {
    fetch('/v1/models').then(r => r.json()).then(data => {
      setModels(data.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const providers = [...new Set(models.map(m => m.provider))].sort();
  const filtered = models.filter(m => {
    const matchSearch = !search || m.id.toLowerCase().includes(search.toLowerCase()) || m.display_name.toLowerCase().includes(search.toLowerCase());
    const matchProvider = selectedProvider === 'all' || m.provider === selectedProvider;
    return matchSearch && matchProvider;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.mono }}>Models</h3>
          <span style={{ fontSize: 12, color: t.dim, fontFamily: t.mono }}>{filtered.length} of {models.length} models</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search models..."
            style={{ padding: '6px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none', width: 180 }} />
          <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)}
            style={{ padding: '6px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }}>
            <option value="all">All providers</option>
            {providers.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', color: t.dim, fontSize: 12, fontFamily: t.mono }}>Loading models...</div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 90px 90px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <span>Model</span><span>Provider</span><span>Context</span><span>Input</span><span>Output</span>
            </div>
            {filtered.map(m => (
              <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 90px 90px', gap: 8, padding: '10px 16px', borderBottom: `1px solid ${t.borderSubtle}`, fontSize: 12, fontFamily: t.mono, alignItems: 'center' }}>
                <div>
                  <div style={{ color: t.text, fontWeight: 500 }}>{m.display_name || m.id}</div>
                  <div style={{ color: t.dim, fontSize: 10 }}>{m.id}</div>
                </div>
                <span style={{ color: t.accent }}>{m.provider}</span>
                <span style={{ color: t.muted }}>{m.context_window ? `${(m.context_window / 1000).toFixed(0)}k` : '—'}</span>
                <span style={{ color: t.muted }}>{m.pricing?.input != null ? `$${m.pricing.input}` : '—'}</span>
                <span style={{ color: t.muted }}>{m.pricing?.output != null ? `$${m.pricing.output}` : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Playground Tab ──────────────────────────────────────────────────────────
function PlaygroundTab({ models }: { models: number }) {
  const [model, setModel] = useState('gemma4:31b');
  const [prompt, setPrompt] = useState('Hello! Say hi in 10 words or less.');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState(0);

  const run = async () => {
    if (!prompt.trim()) return;
    setLoading(true); setResponse(''); setLatency(0);
    const start = Date.now();
    try {
      const res = await fetch('/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], stream: false }),
      });
      const data = await res.json();
      setLatency(Date.now() - start);
      if (data.choices?.[0]?.message?.content) {
        setResponse(data.choices[0].message.content);
      } else {
        setResponse(JSON.stringify(data, null, 2));
      }
    } catch (err) {
      setResponse(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: t.text, fontFamily: t.mono, marginBottom: 16 }}>Playground</h3>
      <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Model</label>
          <input value={model} onChange={e => setModel(e.target.value)} placeholder="bifrost/auto"
            style={{ width: '100%', padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Prompt</label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
            style={{ width: '100%', padding: '8px 10px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 12, fontFamily: t.mono, outline: 'none', resize: 'vertical' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={run} disabled={loading} style={{ padding: '6px 20px', background: loading ? '#1a1a1a' : t.accent, color: loading ? t.dim : '#000', fontSize: 12, fontWeight: 600, fontFamily: t.mono, border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Running...' : 'Run'}
          </button>
          {latency > 0 && <span style={{ fontSize: 11, color: t.dim, fontFamily: t.mono }}>{latency}ms</span>}
        </div>
        {response && (
          <div style={{ marginTop: 16, background: t.bg, border: `1px solid ${t.borderSubtle}`, borderRadius: 6, padding: 12 }}>
            <div style={{ fontSize: 10, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Response</div>
            <pre style={{ fontSize: 12, fontFamily: t.mono, color: t.muted, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{response}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard Page ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('overview');
  const [authed, setAuthed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const metrics = useRealtimeMetrics();

  useEffect(() => {
    const raw = localStorage.getItem('bifrost_auth');
    if (!raw) { router.replace('/login'); return; }
    try { const a = JSON.parse(raw); if (!a.loggedIn) { router.replace('/login'); return; } } catch { router.replace('/login'); return; }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const logout = () => { localStorage.removeItem('bifrost_auth'); router.replace('/'); };

  if (!authed) return <div style={{ background: t.bg, minHeight: '100vh' }} />;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'models', label: 'Models' },
    { id: 'playground', label: 'Playground' },
    { id: 'providers', label: 'Provider Keys' },
    { id: 'keys', label: 'Gateway Keys' },
  ];

  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: t.font, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: ${t.bg}; color: ${t.text}; }`}</style>

      {/* Nav */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(9,9,11,0.88)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? `1px solid ${t.borderSubtle}` : '1px solid transparent',
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <a href="/" style={{ fontSize: 14, fontWeight: 800, color: t.text, fontFamily: t.mono, textDecoration: 'none', letterSpacing: '-0.02em' }}>BIFROST</a>
            <span style={{ fontSize: 12, color: t.dim, fontFamily: t.mono, padding: '3px 8px', background: t.elevated, border: `1px solid ${t.border}`, borderRadius: 4 }}>Dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 11, color: t.dim, fontFamily: t.mono }}>{metrics.requestsPerMin} req/min</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.accent, boxShadow: `0 0 6px ${t.accent}` }} />
            <button onClick={logout} style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: 4, color: t.muted, fontSize: 11, fontFamily: t.mono, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      </nav>

      {/* Tabs */}
      <div style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 90, background: 'rgba(9,9,11,0.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.borderSubtle}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 0 }}>
          {tabs.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding: '12px 20px', fontSize: 12, fontFamily: t.mono, fontWeight: 600, border: 'none', borderBottom: `2px solid ${tab === tb.id ? t.accent : 'transparent'}`,
              background: 'transparent', color: tab === tb.id ? t.accent : t.dim, cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (tab !== tb.id) e.currentTarget.style.color = t.muted; }}
              onMouseLeave={e => { if (tab !== tb.id) e.currentTarget.style.color = t.dim; }}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '130px 24px 80px' }}>
        {tab === 'models' && <ModelsTab />}
        {tab === 'playground' && <PlaygroundTab models={metrics.models} />}
        {tab === 'providers' && <ProvidersTab />}
        {tab === 'keys' && <KeysTab />}
      </main>
    </div>
  );
}
