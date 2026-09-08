import Link from 'next/link';

function CodeBlock({ code, lang = 'typescript', label }: { code: string; lang?: string; label?: string }) {
  return (
    <div style={{ marginBottom: 20, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
      {label && <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>}
      <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function QuickstartPage() {
  return (
    <div>
      <h1 id="quickstart" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Quickstart</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Connect Bifrost to your application in minutes.</p>

      <h2 id="step-1" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 1: Install</h2>
      <CodeBlock label="terminal" code={`npm install openai`} />

      <h2 id="step-2" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 2: Configure</h2>
      <CodeBlock label=".env" code={`OPENAI_API_KEY=your-key\nOPENAI_BASE_URL=https://bifrost.omixsystems.store/v1`} />

      <h2 id="step-3" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 3: Use</h2>
      <CodeBlock label="app.ts" code={`import OpenAI from 'openai';\n\nconst client = new OpenAI();\n\nconst res = await client.chat.completions.create({\n  model: 'bifrost/auto',\n  messages: [{ role: 'user', content: 'Hello!' }],\n});\n\nconsole.log(res.choices[0].message.content);`} />

      <h2 id="step-4" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 4: Verify</h2>
      <CodeBlock label="terminal" code={`curl https://bifrost.omixsystems.store/v1/models | jq '.data | length'\n# 48`} />

      <div style={{ marginTop: 24, padding: 16, background: '#22c55e08', border: '1px solid #22c55e30', borderRadius: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#22c55e', marginBottom: 4 }}>That&apos;s it</div>
        <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.5 }}>Bifrost is now routing your requests. Try <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>&quot;bifrost/auto&quot;</code> for automatic model selection.</div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
        <Link href="/docs/api" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#fafafa', background: '#22c55e', borderRadius: 6, textDecoration: 'none' }}>API Reference</Link>
        <Link href="/docs/providers" style={{ padding: '10px 20px', fontSize: 14, fontWeight: 600, color: '#a1a1aa', background: 'transparent', border: '1px solid #27272a', borderRadius: 6, textDecoration: 'none' }}>Providers</Link>
      </div>
    </div>
  );
}
