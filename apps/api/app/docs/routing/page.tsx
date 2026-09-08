'use client';

export default function RoutingPage() {
  return (
    <div>
      <h1 id="auto-routing" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Auto Routing</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Never depend on one model. Bifrost selects the optimal route automatically.</p>

      <h2 id="how-routing-works" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>How routing works</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {['REQUEST', 'TASK CLASSIFICATION', 'CAPABILITY FILTER', 'POLICY FILTER', 'COST / LATENCY ANALYSIS', 'PROVIDER HEALTH', 'QUOTA', 'ROUTE SCORING', 'BEST ROUTE'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: '6px 14px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: i === 0 || i === 8 ? '#22c55e18' : '#18181b', border: `1px solid ${i === 0 || i === 8 ? '#22c55e40' : '#27272a'}`, color: i === 0 || i === 8 ? '#22c55e' : '#a1a1aa', borderRadius: 4, letterSpacing: '0.04em' }}>
                {step}
              </div>
              {i < 8 && <span style={{ color: '#52525b', fontSize: 10 }}>↓</span>}
            </div>
          ))}
        </div>
      </div>

      <h2 id="routing-factors" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Routing factors</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Bifrost considers:</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
        {['Task requirements', 'Model capabilities', 'Context size', 'Output requirements', 'Cost', 'Latency', 'Provider health', 'Quota', 'Historical performance', 'Tenant policy', 'Data residency', 'Fallback availability'].map(f => (
          <div key={f} style={{ padding: '8px 12px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontSize: 12, color: '#a1a1aa' }}>{f}</div>
        ))}
      </div>

      <h2 id="scoring" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Scoring weights</h2>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Factor</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>Weight</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Capability match', '30%'],
              ['Quality', '25%'],
              ['Reliability', '15%'],
              ['Cost efficiency', '15%'],
              ['Latency', '10%'],
              ['Availability', '5%'],
            ].map(([f, w]) => (
              <tr key={f} style={{ borderBottom: '1px solid #1c1c1f' }}>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{f}</td>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>{w}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="candidates" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Candidate models</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Example routing candidates for a coding task:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { name: 'Claude Sonnet 4', provider: 'Anthropic', score: 82 },
          { name: 'GPT-4o', provider: 'OpenAI', score: 76 },
          { name: 'Gemini 2.5 Flash', provider: 'Google', score: 71 },
          { name: 'Llama 3.3 70B', provider: 'Groq', score: 68 },
        ].map((c, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: i === 0 ? '#22c55e08' : '#0f0f12', border: `1px solid ${i === 0 ? '#22c55e40' : '#27272a'}`, borderRadius: 8 }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: i === 0 ? '#22c55e' : '#fafafa' }}>{c.name}</span>
              <span style={{ fontSize: 11, color: '#52525b', marginLeft: 8 }}>{c.provider}</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: i === 0 ? '#22c55e' : '#a1a1aa' }}>{c.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
