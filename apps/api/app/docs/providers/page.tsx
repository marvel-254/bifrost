  { id: 'openai', name: 'OpenAI', status: 'operational', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming', 'Structured Output'] },
  { id: 'anthropic', name: 'Anthropic', status: 'operational', models: ['claude-sonnet-4', 'claude-opus-4'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
  { id: 'google', name: 'Google', status: 'operational', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
  { id: 'groq', name: 'Groq', status: 'operational', models: ['llama-3.3-70b', 'mixtral-8x7b'], capabilities: ['Text', 'Tools', 'Streaming'] },
  { id: 'mistral', name: 'Mistral', status: 'operational', models: ['mistral-large', 'mistral-small'], capabilities: ['Text', 'Tools', 'Streaming'] },
  { id: 'cerebras', name: 'Cerebras', status: 'operational', models: ['llama-3.3-70b', 'llama-3.1-8b'], capabilities: ['Text', 'Streaming'] },
  { id: 'sambanova', name: 'SambaNova', status: 'operational', models: ['llama-3.3-70b', 'deepseek-r1'], capabilities: ['Text', 'Streaming'] },
  { id: 'openrouter', name: 'OpenRouter', status: 'operational', models: ['llama-3.3-70b:free', 'qwen-2.5-72b:free'], capabilities: ['Text', 'Streaming'] },
  { id: 'cloudflare', name: 'Cloudflare', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
  { id: 'huggingface', name: 'HuggingFace', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
  { id: 'ollama-cloud', name: 'Ollama Cloud', status: 'operational', models: ['gemma4:31b', 'gpt-oss:20b'], capabilities: ['Text', 'Streaming'] },
  { id: 'ollama', name: 'Ollama (Local)', status: 'operational', models: ['llama3', 'mistral', 'gemma2'], capabilities: ['Text', 'Streaming'] },
];

export default function ProvidersPage() {
  return (
    <div>
      <h1 id="providers" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Providers</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>14 providers. 48+ models. One API.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {providers.map(p => (
          <Link key={p.id} href={`/docs/providers/${p.id}`} style={{ display: 'block', padding: 20, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, textDecoration: 'none', transition: 'border-color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e40')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fafafa' }}>{p.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
                </span>
              </div>
              <span style={{ color: '#52525b', fontSize: 12 }}>→</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {p.models.slice(0, 4).map(m => (
                <span key={m} style={{ padding: '3px 8px', fontSize: 11, fontFamily: "'JetBrains Mono', monospace", background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 3 }}>{m}</span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
