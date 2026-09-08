import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Policy-as-Code', description: 'Enforce policies, budgets, and constraints at the gateway layer.' };

export default function PoliciesPage() {
  return (
    <div>
      <h1 id="policies" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Policy-as-Code</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Put your AI infrastructure on policy.</p>

      <h2 id="yaml-example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>YAML example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>production-coding.yaml</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`policy:
  name: production-coding

  match:
    tags:
      - coding
      - production

  constraints:
    max_cost: 0.03
    max_latency_ms: 2000
    data_region: eu

  require:
    tools: true
    structured_output: true

  prefer:
    quality: high

  fallback:
    strategy: auto`}
        </pre>
      </div>

      <h2 id="visual-example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Visual example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 24, maxWidth: 500 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#fafafa', marginBottom: 16 }}>Production Coding</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>WHEN</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '4px 10px', background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12, color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace" }}>tag = coding</span>
            <span style={{ padding: '4px 10px', background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 12, color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace" }}>env = production</span>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>REQUIRE</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['tools', 'structured output', 'EU residency'].map(r => (
              <span key={r} style={{ padding: '4px 10px', background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: 4, fontSize: 12, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>✓ {r}</span>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>LIMIT</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '4px 10px', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 4, fontSize: 12, color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>max cost = $0.03</span>
            <span style={{ padding: '4px 10px', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 4, fontSize: 12, color: '#f59e0b', fontFamily: "'JetBrains Mono', monospace" }}>max latency = 2000ms</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>PREFER</div>
          <span style={{ padding: '4px 10px', background: '#06b6d410', border: '1px solid #06b6d430', borderRadius: 4, fontSize: 12, color: '#06b6d4', fontFamily: "'JetBrains Mono', monospace" }}>quality = high</span>
        </div>
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 24 }}>
        {['Tag-based matching', 'Environment scoping', 'Capability requirements', 'Cost and latency limits', 'Data residency rules', 'Provider restrictions', 'Tenant-specific overrides', 'AND/OR logic'].map(f => (
          <div key={f} style={{ padding: '8px 12px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontSize: 12, color: '#a1a1aa' }}>{f}</div>
        ))}
      </div>
    </div>
  );
}
