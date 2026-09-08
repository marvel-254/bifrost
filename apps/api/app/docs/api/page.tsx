
export default function ApiPage() {
  return (
    <div>
      <h1 id="api-overview" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>API Overview</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Bifrost exposes an OpenAI-compatible API. Drop it into any OpenAI client.</p>

      <div style={{ padding: '14px 18px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, marginBottom: 24, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
        <span style={{ color: '#52525b' }}>Base URL</span><br />
        <span style={{ color: '#22c55e' }}>https://bifrost.omixsystems.store/v1</span>
      </div>

      <h2 id="endpoints" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Endpoints</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { method: 'POST', path: '/v1/chat/completions', desc: 'Create a chat completion' },
          { method: 'GET', path: '/v1/models', desc: 'List available models' },
        ].map(e => (
          <div key={e.path} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6 }}>
            <span style={{ padding: '3px 8px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: e.method === 'POST' ? '#22c55e18' : '#06b6d418', color: e.method === 'POST' ? '#22c55e' : '#06b6d4', borderRadius: 3 }}>{e.method}</span>
            <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#fafafa' }}>{e.path}</span>
            <span style={{ fontSize: 12, color: '#52525b', marginLeft: 'auto' }}>{e.desc}</span>
          </div>
        ))}
      </div>

      <h2 id="authentication" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Authentication</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Pass your gateway key via the Authorization header:</p>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`Authorization: Bearer sk-bifrost-your-key-here`}
        </pre>
      </div>

      <h2 id="bifrost-options" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Bifrost-specific options</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>These can be added to any chat completion request:</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Parameter</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['model', 'string', 'Use "bifrost/auto" for intelligent routing'],
              ['temperature', 'number', 'Sampling temperature (0-2)'],
              ['max_tokens', 'integer', 'Maximum tokens to generate'],
              ['stream', 'boolean', 'Enable streaming responses'],
            ].map(([p, t, d]) => (
              <tr key={p} style={{ borderBottom: '1px solid #1c1c1f' }}>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>{p}</td>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{t}</td>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
