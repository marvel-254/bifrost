import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Architecture', description: 'Bifrost system architecture and components.' };

const components = [
  { title: 'Gateway', desc: 'Provider translation and request routing', href: '/docs/api' },
  { title: 'Optimization', desc: 'Compression, cache, recoverable context', href: '/docs/optimization' },
  { title: 'Reliability', desc: 'Fallback, circuit breaker, self-healing', href: '/docs/reliability' },
  { title: 'Economics', desc: 'Quotas, forecasting, cost optimization', href: '/docs/economics' },
  { title: 'Policies', desc: 'Policy-as-code, tenants, data residency', href: '/docs/policies' },
  { title: 'Observability', desc: 'Tracing, benchmarks, experiments', href: '/docs/observability' },
];

export default function ArchitecturePage() {
  return (
    <div>
      <h1 id="architecture" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Architecture</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>How Bifrost is built.</p>

      <h2 id="system-overview" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>System overview</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ padding: '10px 24px', fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: '#22c55e18', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: 6 }}>BIFROST</div>
          <span style={{ color: '#52525b' }}>↓</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 500 }}>
            {['Gateway', 'Intelligence', 'Optimization'].map(c => (
              <div key={c} style={{ padding: '8px 12px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 4 }}>{c}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%', maxWidth: 500 }}>
            {['Reliability', 'Economics', 'Observability'].map(c => (
              <div key={c} style={{ padding: '8px 12px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 4 }}>{c}</div>
            ))}
          </div>
          <span style={{ color: '#52525b' }}>↓</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['OpenAI', 'Anthropic', 'Google', 'Groq', 'Mistral', '+9 more'].map(p => (
              <span key={p} style={{ padding: '4px 10px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 4 }}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      <h2 id="components" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Components</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {components.map(c => (
          <Link key={c.title} href={c.href} style={{ display: 'block', padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e40')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{c.desc}</div>
          </Link>
        ))}
      </div>

      <h2 id="execution-pipeline" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: 32 }}>Execution pipeline</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Every request flows through:</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {['REQUEST', 'UNDERSTAND', 'OPTIMIZE', 'CACHE', 'PREDICT', 'ROUTE', 'EXECUTE', 'VALIDATE', 'RECOVER', 'OBSERVE', 'LEARN'].map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ padding: '6px 12px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 4, letterSpacing: '0.04em' }}>{step}</div>
            {i < 10 && <span style={{ color: '#52525b', fontSize: 9 }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
