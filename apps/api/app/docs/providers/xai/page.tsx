'use client';

export default function XAIProviderPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Available
        </span>
      </div>
      <h1 id="xai" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>xAI / Grok</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>
        Grok models via xAI. $25 free credit on signup.
      </p>

      <h2 id="models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Models</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {['grok-3', 'grok-3-mini'].map(m => (
          <div key={m} style={{ padding: '10px 14px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fafafa' }}>{m}</div>
        ))}
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['Text', 'Vision', 'Tools', 'Streaming'].map(c => (
          <span key={c} style={{ padding: '4px 10px', fontSize: 12, background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 4 }}>✓ {c}</span>
        ))}
      </div>

      <h2 id="setup" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Setup</h2>
      <ol style={{ fontSize: 15, color: '#a1a1aa', lineHeight: 1.8, paddingLeft: 20, marginBottom: 24 }}>
        <li>Create an account at <a href="https://console.x.ai" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>console.x.ai</a></li>
        <li>Receive $25 in free credits on signup</li>
        <li>Generate an API key from the dashboard</li>
      </ol>

      <h2 id="configuration" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Configuration</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`Base URL: https://api.x.ai/v1
Environment variable:
XAI_API_KEY=...

Or configure via dashboard:
Dashboard → Provider Keys → Add Key → xai`}
        </pre>
      </div>

      <h2 id="example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`curl https://your-bifrost-url/api/chat/completions \\
  -H "Authorization: Bearer $BIFROST_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "grok-3",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
        </pre>
      </div>
    </div>
  );
}
