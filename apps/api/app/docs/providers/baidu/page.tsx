'use client';
import Link from 'next/link';

export default function BaiduProviderPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
        </span>
      </div>
      <h1 id="baidu" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Baidu / ERNIE</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Baidu&apos;s ERNIE models with free-tier speed models.</p>

      <h2 id="setup" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Setup</h2>
      <p style={{ fontSize: 14, color: '#d4d4d8', marginBottom: 12, lineHeight: 1.6 }}>
        1. Create an account at <Link href="https://cloud.baidu.com" style={{ color: '#60a5fa', textDecoration: 'underline' }}>cloud.baidu.com</Link>.<br />
        2. Enable Qianfan and generate an API key.<br />
        3. Set the environment variable below.
      </p>

      <h2 id="api-key" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>API Key</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`BAIDU_API_KEY=...
# or
QIANFAN_API_KEY=...`}
        </pre>
      </div>

      <h2 id="base-url" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Base URL</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`OpenAI-compatible: https://qianfan.baidubce.com/v2
Native: https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop`}
        </pre>
      </div>

      <h2 id="models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Models</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {[
          { name: 'ernie-speed-128k', note: ' (free tier)' },
          { name: 'ernie-4.0-8k', note: '' },
        ].map(m => (
          <div key={m.name} style={{ padding: '10px 14px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fafafa' }}>
            {m.name}{m.note && <span style={{ color: '#22c55e', fontSize: 12 }}>{m.note}</span>}
          </div>
        ))}
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['Text', 'Streaming'].map(c => (
          <span key={c} style={{ padding: '4px 10px', fontSize: 12, background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 4 }}>✓ {c}</span>
        ))}
      </div>

      <h2 id="example" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Example</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`curl https://qianfan.baidubce.com/v2/chat/completions \\
  -H "Authorization: Bearer $BAIDU_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "ernie-speed-128k",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`}
        </pre>
      </div>
    </div>
  );
}
