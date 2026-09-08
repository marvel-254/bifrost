'use client';

export default function EconomicsPage() {
  return (
    <div>
      <h1 id="economics" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Cost & Quotas</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Use every available unit of AI capacity.</p>

      <h2 id="features" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Features</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { title: 'Cost Optimization', desc: 'Select providers based on cost efficiency per request.' },
          { title: 'Quota Forecasting', desc: 'Predict when quotas will be exhausted.' },
          { title: 'Multi-Account Rotation', desc: 'Spread load across multiple accounts.' },
          { title: 'Spend Guardrails', desc: 'Enforce budgets per tenant, application, or model.' },
          { title: 'Account Rotation', desc: 'Automatically rotate between accounts.' },
        ].map(f => (
          <div key={f.title} style={{ padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <h2 id="capacity-view" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Provider capacity</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 500 }}>
        {[
          { provider: 'Provider A', account: 'Account 1', remaining: 72 },
          { provider: 'Provider A', account: 'Account 2', remaining: 41 },
          { provider: 'Provider B', account: 'Account 1', remaining: 89 },
          { provider: 'Provider C', account: 'Free tier', remaining: 18 },
        ].map((q, i) => (
          <div key={i} style={{ padding: '12px 16px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fafafa' }}>{q.provider} / {q.account}</span>
              <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: q.remaining > 50 ? '#22c55e' : q.remaining > 25 ? '#f59e0b' : '#ef4444' }}>{q.remaining}%</span>
            </div>
            <div style={{ height: 4, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${q.remaining}%`, background: q.remaining > 50 ? '#22c55e' : q.remaining > 25 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
