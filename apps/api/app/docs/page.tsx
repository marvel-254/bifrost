import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'Bifrost documentation — learn how to route, optimize, and manage AI requests across multiple providers.',
};

const pipeline = ['REQUEST', 'OPTIMIZE', 'CACHE', 'ROUTE', 'EXECUTE', 'VALIDATE', 'RECOVER', 'OBSERVE'];

export default function DocsHome() {
  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Bifrost Docs</h1>
      <p style={{ fontSize: 16, color: '#a1a1aa', marginBottom: 32, lineHeight: 1.6 }}>Build once. Route everywhere.</p>

      {/* Search box placeholder */}
      <div style={{ padding: '14px 18px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, marginBottom: 40, color: '#52525b', fontSize: 14 }}>
        Search documentation, APIs, providers, models…
      </div>

      {/* Primary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
        {[
          { title: 'Quickstart', desc: 'Make your first Bifrost request.', href: '/docs/quickstart', label: 'Start building' },
          { title: 'Core Concepts', desc: 'Understand how Bifrost routes and optimizes requests.', href: '/docs/concepts', label: 'Learn Bifrost' },
          { title: 'API Reference', desc: 'Explore endpoints, parameters, responses, and errors.', href: '/docs/api', label: 'Explore API' },
        ].map(c => (
          <Link key={c.href} href={c.href} style={{ display: 'block', padding: 24, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, textDecoration: 'none', transition: 'border-color 0.15s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e40'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fafafa', marginBottom: 6 }}>{c.title}</div>
            <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12, lineHeight: 1.5 }}>{c.desc}</div>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{c.label} →</span>
          </Link>
        ))}
      </div>

      {/* Pipeline */}
      <h2 id="pipeline" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Execution Pipeline</h2>
      <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>Every request passes through Bifrost&apos;s execution engine.</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 48 }}>
        {pipeline.map((step, i) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link href={`/docs/${step.toLowerCase() === 'request' ? 'quickstart' : step.toLowerCase() === 'optimize' ? 'optimization' : step.toLowerCase() === 'route' ? 'routing' : step.toLowerCase() === 'recover' ? 'reliability' : step.toLowerCase() === 'observe' ? 'observability' : step.toLowerCase() === 'execute' ? 'api' : 'concepts'}`}
              style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 4, textDecoration: 'none', letterSpacing: '0.04em', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#22c55e'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#a1a1aa'; }}>
              {step}
            </Link>
            {i < pipeline.length - 1 && <span style={{ color: '#52525b', fontSize: 10 }}>→</span>}
          </div>
        ))}
      </div>

      {/* Major areas */}
      <h2 id="areas" style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Major Areas</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {[
          { title: 'Routing', desc: 'Automatic model and provider selection based on capability, cost, latency, and health.', href: '/docs/routing' },
          { title: 'Optimization', desc: 'Prompt compression, tool output compression, semantic caching, and recoverable context.', href: '/docs/optimization' },
          { title: 'Reliability', desc: 'Automatic fallback, circuit breakers, self-healing, and multi-account rotation.', href: '/docs/reliability' },
          { title: 'Observability', desc: 'Request tracing, cost attribution, provider health, and optimizer scoring.', href: '/docs/observability' },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ display: 'block', padding: 20, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e40')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fafafa', marginBottom: 4 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{a.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
