  title: 'Quickstart',
  description: 'Connect Bifrost to your application in minutes.',
};

function CodeBlock({ code, lang = 'typescript', label }: { code: string; lang?: string; label?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>}
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>{lang}</span>
        </div>
        <pre style={{ padding: 16, margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7, overflowX: 'auto' }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}

function Callout({ type, children }: { type: 'note' | 'tip' | 'warning'; children: React.ReactNode }) {
  const colors = { note: '#06b6d4', tip: '#22c55e', warning: '#f59e0b' };
  return (
    <div style={{ padding: '14px 18px', background: `${colors[type]}08`, border: `1px solid ${colors[type]}30`, borderRadius: 8, marginBottom: 20, fontSize: 13, color: '#a1a1aa', lineHeight: 1.6 }}>
      <span style={{ fontWeight: 700, color: colors[type], textTransform: 'uppercase', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em' }}>{type}</span>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

export default function QuickstartPage() {
  return (
    <div>
      <h1 id="quickstart" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Quickstart</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 32, lineHeight: 1.6 }}>Connect Bifrost to your application in minutes.</p>

      <h2 id="step-1" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 1: Get an API key</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Sign up at <a href="/signup" style={{ color: '#22c55e' }}>bifrost.omixsystems.store/signup</a> and create a gateway key from the dashboard.
      </p>

      <h2 id="step-2" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 2: Configure your client</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Bifrost is OpenAI-compatible. Point any OpenAI client to Bifrost:
      </p>

      <CodeBlock lang="TypeScript" label="Install the OpenAI SDK" code={`npm install openai`} />

      <CodeBlock lang="TypeScript" label="Configure the client" code={`import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.BIFROST_API_KEY,
  baseURL: "https://bifrost.omixsystems.store/v1"
});`} />

      <h2 id="step-3" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Step 3: Make a request</h2>

      <CodeBlock lang="TypeScript" label="Chat completion" code={`const response = await client.chat.completions.create({
  model: "bifrost/auto",
  messages: [
    {
      role: "user",
      content: "Explain this function."
    }
  ]
});

console.log(response.choices[0].message.content);`} />

      <Callout type="tip">
        Use <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>bifrost/auto</code> when you want Bifrost to select the execution route automatically. You can also specify a specific model like <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>"gpt-4o"</code> or <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>"claude-sonnet-4"</code>.
      </Callout>

      <h2 id="what-happens" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>What happens next</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Your application makes one request. Bifrost handles the execution strategy.
      </p>

      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
          {['REQUEST', 'CLASSIFY', 'OPTIMIZE', 'ROUTE', 'EXECUTE', 'VALIDATE', 'RESPONSE'].map((step, i) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: '6px 16px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, background: i === 0 || i === 6 ? '#22c55e18' : '#18181b', border: `1px solid ${i === 0 || i === 6 ? '#22c55e40' : '#27272a'}`, color: i === 0 || i === 6 ? '#22c55e' : '#a1a1aa', borderRadius: 4, letterSpacing: '0.04em' }}>
                {step}
              </div>
              {i < 6 && <span style={{ color: '#52525b', fontSize: 10 }}>↓</span>}
            </div>
          ))}
        </div>
      </div>

      <h2 id="bifrost-automatically" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Bifrost automatically</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {[
          'Selects a suitable model',
          'Selects a provider',
          'Optimizes context',
          'Handles fallback',
          'Records the execution trace',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#a1a1aa' }}>
            <span style={{ color: '#22c55e' }}>✓</span> {item}
          </div>
        ))}
      </div>

      <Callout type="note">
        Bifrost routes across 14 providers and 48+ models. The routing engine considers capability, cost, latency, health, and quota to select the optimal execution path.
      </Callout>

      <h2 id="next-steps" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Next steps</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[
          { label: 'Core Concepts', href: '/docs/concepts', desc: 'Understand how Bifrost works' },
          { label: 'API Reference', href: '/docs/api', desc: 'Explore all endpoints' },
          { label: 'Routing', href: '/docs/routing', desc: 'Learn about intelligent routing' },
          { label: 'Providers', href: '/docs/providers', desc: 'Configure model providers' },
        ].map(n => (
          <a key={n.href} href={n.href} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e40')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fafafa' }}>{n.label}</div>
              <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>{n.desc}</div>
            </div>
            <span style={{ color: '#52525b', fontSize: 12 }}>→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
