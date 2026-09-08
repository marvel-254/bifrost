'use client';


export default function ModelsPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ padding: '3px 10px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: '#06b6d418', color: '#06b6d4', borderRadius: 3 }}>GET</span>
        <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#fafafa' }}>/v1/models</span>
      </div>
      <h1 id="models" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>List Models</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>List all available models across all registered providers.</p>

      <h2 id="response" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Response</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>Response — 200 OK</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`{
  "object": "list",
  "data": [
    {
      "id": "gpt-4o",
      "object": "model",
      "provider": "openai",
      "display_name": "GPT-4o",
      "context_window": 128000,
      "capabilities": {
        "streaming": true,
        "tool_use": true
      },
      "pricing": {
        "input": 0.0025,
        "output": 0.01
      }
    }
  ],
  "total": 48
}`}
        </pre>
      </div>

      <h2 id="available-models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Available Models</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>48 models across 14 providers. Use <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>bifrost/auto</code> for automatic selection.</p>
    </div>
  );
}
