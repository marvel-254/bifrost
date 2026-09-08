import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chat Completions', description: 'POST /v1/chat/completions — create chat completions with intelligent routing.' };

export default function ChatCompletionsPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ padding: '3px 10px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, background: '#22c55e18', color: '#22c55e', borderRadius: 3 }}>POST</span>
        <span style={{ fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#fafafa' }}>/v1/chat/completions</span>
      </div>
      <h1 id="chat-completions" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Chat Completions</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Create a chat completion. Compatible with OpenAI API format.</p>

      <h2 id="request-body" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Request Body</h2>
      <div style={{ overflowX: 'auto', marginBottom: 24 }}>
        <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #27272a' }}>
              {['Parameter', 'Type', 'Required', 'Description'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: '#52525b', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ['model', 'string', 'Yes', 'Model ID. Use "bifrost/auto" for automatic routing.'],
              ['messages', 'array', 'Yes', 'Array of message objects with role and content.'],
              ['stream', 'boolean', 'No', 'Enable streaming. Default: false.'],
              ['temperature', 'number', 'No', 'Sampling temperature. Default: 0.7.'],
              ['max_tokens', 'integer', 'No', 'Max tokens. Default: 4096.'],
              ['tools', 'array', 'No', 'Tool definitions for function calling.'],
            ].map(([p, t, r, d]) => (
              <tr key={p} style={{ borderBottom: '1px solid #1c1c1f' }}>
                <td style={{ padding: '8px 12px', fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>{p}</td>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{t}</td>
                <td style={{ padding: '8px 12px', color: r === 'Yes' ? '#f59e0b' : '#52525b' }}>{r}</td>
                <td style={{ padding: '8px 12px', color: '#a1a1aa' }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>Request</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`{
  "model": "bifrost/auto",
  "messages": [
    { "role": "user", "content": "Hello!" }
  ]
}`}
        </pre>
      </div>

      <h2 id="response" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Response</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>Response — 200 OK</div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
{`{
  "id": "bifrost_1234",
  "object": "chat.completion",
  "model": "claude-sonnet-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 8,
    "total_tokens": 20
  }
}`}
        </pre>
      </div>

      <h2 id="bifrost-decision" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Bifrost Decision</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>When using <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>bifrost/auto</code>, Bifrost selects the optimal model and provider automatically based on capability, cost, latency, and health.</p>

      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, maxWidth: 400 }}>
        <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Bifrost Decision</div>
        {[
          ['Model', 'Claude Sonnet 4'],
          ['Provider', 'Anthropic'],
          ['Route score', '94'],
          ['Compression', '31%'],
          ['Cache', 'MISS'],
          ['Latency', '842ms'],
          ['Cost', '$0.018'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
            <span style={{ color: '#52525b' }}>{k}</span>
            <span style={{ color: k === 'Route score' ? '#22c55e' : '#a1a1aa' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
