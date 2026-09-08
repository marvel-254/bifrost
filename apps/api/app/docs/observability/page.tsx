import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Observability', description: 'Request tracing, metrics, and monitoring.' };

export default function ObservabilityPage() {
  return (
    <div>
      <h1 id="observability" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Observability</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>See what Bifrost is doing for every request.</p>

      <h2 id="request-trace" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Request trace</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        {['Request', 'Authentication', 'Tenant Resolution', 'Policy', 'Classification', 'Compression', 'Cache (MISS)', 'Capability Filtering', 'Route Scoring', 'Provider', 'Validation', 'Response'].map((step, i) => (
          <div key={step} style={{ padding: '10px 16px', borderBottom: i < 11 ? '1px solid #1c1c1f' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#fafafa' }}>{step}</span>
            </div>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#52525b' }}>{i === 6 ? '—' : `${Math.floor(Math.random() * 50) + 1}ms`}</span>
          </div>
        ))}
      </div>

      <h2 id="features" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Features</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { title: 'Request Tracing', desc: 'Full trace of every request through the execution pipeline.' },
          { title: 'Cost Attribution', desc: 'Track cost per request, model, provider, and tenant.' },
          { title: 'Provider Health', desc: 'Monitor provider status, latency, and error rates.' },
          { title: 'Optimizer Score', desc: 'Composite measure of optimization effectiveness.' },
          { title: 'Shadow Routing', desc: 'Compare production vs shadow routes without affecting responses.' },
          { title: 'What-If Simulator', desc: 'Simulate policy changes before deploying.' },
        ].map(f => (
          <div key={f.title} style={{ padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <h2 id="optimizer-score" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Optimizer Score</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, maxWidth: 350, textAlign: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>94</div>
        <div style={{ fontSize: 12, color: '#52525b', marginBottom: 20 }}>/ 100</div>
        {[
          ['Cost efficiency', 92],
          ['Token efficiency', 97],
          ['Latency', 89],
          ['Reliability', 99],
          ['Route quality', 94],
        ].map(([l, v]) => (
          <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#52525b', width: 100, textAlign: 'right' }}>{String(l)}</span>
            <div style={{ flex: 1, height: 4, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${v}%`, background: '#22c55e', borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', width: 24 }}>{String(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
