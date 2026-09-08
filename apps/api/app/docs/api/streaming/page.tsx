import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Streaming', description: 'Stream chat completions in real-time.' };

export default function StreamingPage() {
  return (
    <div>
      <h1 id="streaming" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Streaming</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Stream chat completions in real-time using Server-Sent Events.</p>

      <h2 id="usage" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Usage</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Set <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>stream: true</code> in your request:</p>

      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>Request</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`{
  "model": "bifrost/auto",
  "messages": [
    { "role": "user", "content": "Write a story" }
  ],
  "stream": true
}`}
        </pre>
      </div>

      <h2 id="stream-format" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Stream format</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>Each chunk is a Server-Sent Event with JSON data:</p>

      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>Response chunks</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`data: {"choices":[{"delta":{"role":"assistant"}}]}

data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":"!"}}]}

data: [DONE]`}
        </pre>
      </div>

      <div style={{ padding: '14px 18px', background: '#22c55e08', border: '1px solid #22c55e30', borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
        <span style={{ fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>tip</span>
        <div style={{ marginTop: 6 }}>The OpenAI SDK handles streaming automatically. Use <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>client.chat.completions.create({'{'}stream: true{'}'})</code> for automatic streaming.</div>
      </div>
    </div>
  );
}
