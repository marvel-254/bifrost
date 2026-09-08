
export default function ReliabilityPage() {
  return (
    <div>
      <h1 id="reliability" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Reliability</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>When providers fail, your application shouldn&apos;t.</p>

      <h2 id="failover-flow" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Failover flow</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {['REQUEST', 'PROVIDER A', 'TIMEOUT', 'CIRCUIT BREAKER', 'PROVIDER B', 'SUCCESS'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ padding: '6px 12px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: step === 'TIMEOUT' || step === 'CIRCUIT BREAKER' ? '#ef444418' : step === 'SUCCESS' ? '#22c55e18' : '#18181b', border: `1px solid ${step === 'TIMEOUT' || step === 'CIRCUIT BREAKER' ? '#ef444440' : step === 'SUCCESS' ? '#22c55e40' : '#27272a'}`, color: step === 'TIMEOUT' || step === 'CIRCUIT BREAKER' ? '#ef4444' : step === 'SUCCESS' ? '#22c55e' : '#a1a1aa', borderRadius: 4, letterSpacing: '0.04em' }}>
                {step}
              </div>
              {i < 5 && <span style={{ color: '#52525b', fontSize: 10 }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      <h2 id="features" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Features</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { title: 'Automatic Fallback', desc: 'Retry and failover to the next best provider on failure.' },
          { title: 'Circuit Breakers', desc: 'Stop calling failing providers until they recover.' },
          { title: 'Provider Cooldowns', desc: 'Temporarily disable providers after repeated failures.' },
          { title: 'Self-Healing', desc: 'Automatically re-enable providers when they recover.' },
          { title: 'Backpressure', desc: 'Manage load across providers to prevent overload.' },
          { title: 'Priority Queues', desc: 'Order requests by priority during high load.' },
          { title: 'Stream Keepalive', desc: 'Maintain streaming connections during provider issues.' },
          { title: 'Multi-Account Rotation', desc: 'Spread load across multiple accounts per provider.' },
        ].map(f => (
          <div key={f.title} style={{ padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <h2 id="bounded-retry" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Bounded retry</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Retry is bounded. Bifrost will not retry indefinitely. Every request has a maximum number of attempts.
        Authentication failures and malformed requests are never retried.
      </p>
    </div>
  );
}
