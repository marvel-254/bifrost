'use client';
import Link from 'next/link';

export default function HyperbolicProviderPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
        </span>
      </div>
      <h1 id="hyperbolic" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Hyperbolic</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Open-source AI infrastructure with free credits on signup.</p>

      <h2 id="setup" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Setup</h2>
      <p style={{ fontSize: 14, color: '#d4d4d8', marginBottom: 12, lineHeight: 1.6 }}>
        1. Create an account at <Link href="https://hyperbolic.xyz" style={{ color: '#60a5fa', textDecoration: 'underline' }}>hyperbolic.xyz</Link>.<br />
        2. You receive free credits on signup.<br />
        3. Generate an API key from the dashboard.<br />
        4. Set the environment variable below.
      </p>

      <h2 id="api-key" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>API Key</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`HYPERBOLIC_API_KEY=hb-...`}
        </pre>
      </div>

      <h2 id="base-url" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Base URL</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`https://api.hyperbolic.xyz/v1`}
        </pre>
      </div>

      <h2 id="models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Models</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {['meta-llama/Meta-Llama-3.3-70B-Instruct', 'deepseek-ai/DeepSeek-V3'].map(m => (
          <div key={m} style={{ padding: '10px 14px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fafafa' }}>{m}</div>
        ))}
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['Text', 'Streaming', 'Tools'].map(c => (
          <span key={c} style={{ padding: '4px 10px', fontSize: 12, background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 4 }}>✓ {c}</span>
        ))}
      </div>

      <h2 id="example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`curl https://api.hyperbolic.xyz/v1/chat/completions \\
  -H "Authorization: Bearer $HYPERBOLIC_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "meta-llama/Meta-Llama-3.3-70B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
        </pre>
      </div>
    </div>
  );
}
