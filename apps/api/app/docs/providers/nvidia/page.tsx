'use client';

import Link from 'next/link';

export default function NvidiaProviderPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
        </span>
      </div>
      <h1 id="nvidia" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Nvidia NIM</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Llama and other models via NVIDIA NIM API.</p>

      <h2 id="pricing" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Pricing</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>
        Free 40 requests per minute on build.nvidia.com.
      </p>

      <h2 id="models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Models</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {['nvidia/llama-3.3-70b-instruct', 'meta/llama-3.1-8b-instruct'].map(m => (
          <div key={m} style={{ padding: '10px 14px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fafafa' }}>{m}</div>
        ))}
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['Text', 'Tools', 'Streaming'].map(c => (
          <span key={c} style={{ padding: '4px 10px', fontSize: 12, background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 4 }}>✓ {c}</span>
        ))}
      </div>

      <h2 id="base-url" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Base URL</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`https://integrate.api.nvidia.com/v1`}
        </pre>
      </div>

      <h2 id="configuration" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Configuration</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`Environment variable:
NVIDIA_API_KEY=nvapi-...

Or configure via dashboard:
Dashboard → Provider Keys → Add Key → nvidia`}
        </pre>
      </div>

      <h2 id="example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`curl https://api.bifrost.dev/v1/chat/completions \\
  -H "Authorization: Bearer $BIFROST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "nvidia/llama-3.3-70b-instruct",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
        </pre>
      </div>

      <h2 id="setup" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Setup</h2>
      <ol style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.8, paddingLeft: 20 }}>
        <li>Create an account at <Link href="https://build.nvidia.com" style={{ color: '#60a5fa', textDecoration: 'none' }}>build.nvidia.com</Link></li>
        <li>Navigate to API Keys in your account settings</li>
        <li>Generate a new API key</li>
        <li>Set the <code style={{ background: '#27272a', padding: '2px 6px', borderRadius: 3, fontSize: 13 }}>NVIDIA_API_KEY</code> environment variable</li>
        <li>Configure the provider in the Bifröst dashboard</li>
      </ol>
    </div>
  );
}
