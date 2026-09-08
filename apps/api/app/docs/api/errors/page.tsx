import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Errors', description: 'Bifrost error codes and handling.' };

export default function ErrorsPage() {
  return (
    <div>
      <h1 id="errors" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Errors</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Bifrost returns structured error responses.</p>

      <h2 id="error-format" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Error format</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`{
  "error": {
    "type": "provider_error",
    "code": "provider_timeout",
    "message": "Provider did not respond within timeout",
    "request_id": "bifrost_1234"
  }
}`}
        </pre>
      </div>

      <h2 id="error-types" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Error types</h2>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a' }}>
              {['Type', 'Description', 'Retryable'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['authentication_error', 'Invalid or missing API key', 'No'],
              ['invalid_request_error', 'Malformed request body', 'No'],
              ['model_not_found', 'Requested model does not exist', 'No'],
              ['provider_error', 'Provider returned an error', 'Yes'],
              ['rate_limit', 'Provider rate limit exceeded', 'Yes'],
              ['routing_error', 'No eligible model found', 'No'],
              ['internal_error', 'Bifrost internal error', 'Yes'],
            ].map(([t, d, r]) => (
              <tr key={t} style={{ borderBottom: '1px solid #1c1c1f' }}>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>{t}</td>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{d}</td>
                <td style={{ padding: '8px 12px', color: r === 'Yes' ? '#22c55e' : '#ef4444' }}>{r}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
