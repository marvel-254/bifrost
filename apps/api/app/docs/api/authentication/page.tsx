'use client';


export default function AuthPage() {
  return (
    <div>
      <h1 id="authentication" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Authentication</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Bifrost uses gateway keys for API authentication.</p>

      <h2 id="gateway-keys" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Gateway keys</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Create a gateway key from the <a href="/dashboard" style={{ color: '#22c55e' }}>dashboard</a>. Keys start with <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>sk-bifrost-</code>.</p>

      <h2 id="using-keys" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Using keys</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Pass the key via the Authorization header:</p>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`Authorization: Bearer sk-bifrost-your-key-here`}
        </pre>
      </div>

      <h2 id="environment-variable" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Environment variable</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`BIFROST_API_KEY=sk-bifrost-your-key-here`}
        </pre>
      </div>

      <div style={{ padding: '14px 18px', background: '#f59e0b08', border: '1px solid #f59e0b30', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
        <span style={{ fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>warning</span>
        <div style={{ marginTop: 6 }}>Never expose your API key in client-side code. Always make requests from a server.</div>
      </div>
    </div>
  );
}
