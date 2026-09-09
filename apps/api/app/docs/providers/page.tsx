'use client';
import Link from 'next/link';

const categories = [
  { name: 'Core Providers', desc: 'Direct API access with native authentication', providers: [
    { id: 'openai', name: 'OpenAI', status: 'operational', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
    { id: 'anthropic', name: 'Anthropic', status: 'operational', models: ['claude-sonnet-4', 'claude-opus-4'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
    { id: 'google', name: 'Google', status: 'operational', models: ['gemini-2.5-pro', 'gemini-2.5-flash'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
    { id: 'mistral', name: 'Mistral', status: 'operational', models: ['mistral-large', 'mistral-small'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'deepseek', name: 'DeepSeek', status: 'operational', models: ['deepseek-chat', 'deepseek-reasoner'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'cohere', name: 'Cohere', status: 'operational', models: ['command-r-plus', 'command-r'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'ai21', name: 'AI21 Labs', status: 'operational', models: ['jamba-large-1', 'jamba-mini-1'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'xai', name: 'xAI / Grok', status: 'operational', models: ['grok-3', 'grok-3-mini'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
  ]},
  { name: 'High-Performance Inference', desc: 'Ultra-fast inference with free tiers', providers: [
    { id: 'groq', name: 'Groq', status: 'operational', models: ['llama-3.3-70b', 'mixtral-8x7b'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'cerebras', name: 'Cerebras', status: 'operational', models: ['llama-3.3-70b', 'llama-3.1-8b'], capabilities: ['Text', 'Streaming'] },
    { id: 'sambanova', name: 'SambaNova', status: 'operational', models: ['llama-3.3-70b', 'deepseek-r1'], capabilities: ['Text', 'Streaming'] },
    { id: 'nvidia', name: 'Nvidia NIM', status: 'operational', models: ['llama-3.3-70b', 'llama-3.1-8b'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'nscale', name: 'Nscale', status: 'operational', models: ['llama-3.1-8b'], capabilities: ['Text', 'Streaming'] },
  ]},
  { name: 'Cloud Inference Platforms', desc: 'Scalable inference with pay-as-you-go pricing', providers: [
    { id: 'together', name: 'Together AI', status: 'operational', models: ['llama-3.3-70b-turbo', 'deepseek-v3'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'fireworks', name: 'Fireworks AI', status: 'operational', models: ['llama-3.3-70b', 'deepseek-v3'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'deepinfra', name: 'DeepInfra', status: 'operational', models: ['llama-3.3-70b', 'deepseek-v3'], capabilities: ['Text', 'Streaming'] },
    { id: 'novita', name: 'Novita AI', status: 'operational', models: ['llama-3.3-70b', 'deepseek-r1'], capabilities: ['Text', 'Streaming'] },
    { id: 'lepton', name: 'Lepton AI', status: 'operational', models: ['llama-3.3-70b', 'qwen-72b'], capabilities: ['Text', 'Streaming'] },
    { id: 'hyperbolic', name: 'Hyperbolic', status: 'operational', models: ['llama-3.3-70b', 'deepseek-v3'], capabilities: ['Text', 'Streaming'] },
    { id: 'anyscale', name: 'Anyscale', status: 'operational', models: ['llama-3.1-70b'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'baseten', name: 'Baseten', status: 'operational', models: ['deepseek-v3'], capabilities: ['Text', 'Streaming'] },
    { id: 'replicate', name: 'Replicate', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
    { id: 'featherless', name: 'Featherless AI', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
    { id: 'mancer', name: 'Mancer', status: 'operational', models: ['mythomax-l2-13b'], capabilities: ['Text', 'Streaming'] },
  ]},
  { name: 'Gateways & Routers', desc: 'Aggregators that proxy multiple providers', providers: [
    { id: 'openrouter', name: 'OpenRouter', status: 'operational', models: ['llama-3.3-70b:free', 'qwen-2.5-72b:free'], capabilities: ['Text', 'Streaming'] },
    { id: 'vercel-gateway', name: 'Vercel AI Gateway', status: 'operational', models: ['gpt-4o', 'claude-sonnet-4', 'gemini-2.5-pro'], capabilities: ['Text', 'Vision', 'Tools', 'Streaming'] },
    { id: 'cloudflare', name: 'Cloudflare Workers AI', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
    { id: 'huggingface', name: 'HuggingFace', status: 'operational', models: ['llama-3.3-70b', 'qwen-2.5-72b'], capabilities: ['Text', 'Streaming'] },
    { id: 'bittensor', name: 'Bittensor', status: 'operational', models: ['llama-3.3-70b'], capabilities: ['Text', 'Streaming'] },
  ]},
  { name: 'Chinese Ecosystem', desc: 'Providers from the Chinese AI ecosystem', providers: [
    { id: 'qwen', name: 'Alibaba / Qwen', status: 'operational', models: ['qwen-turbo', 'qwen-plus', 'qwen-max'], capabilities: ['Text', 'Tools', 'Streaming'] },
    { id: 'zhipu', name: 'Zhipu AI / GLM', status: 'operational', models: ['glm-4-flash', 'glm-4-plus'], capabilities: ['Text', 'Streaming'] },
    { id: 'baidu', name: 'Baidu / ERNIE', status: 'operational', models: ['ernie-speed-128k', 'ernie-4.0'], capabilities: ['Text', 'Streaming'] },
    { id: 'tencent', name: 'Tencent / Hunyuan', status: 'operational', models: ['hunyuan-standard'], capabilities: ['Text', 'Streaming'] },
    { id: 'doubao', name: 'ByteDance / Doubao', status: 'operational', models: ['doubao-pro-256k', 'doubao-lite-128k'], capabilities: ['Text', 'Streaming'] },
    { id: 'moonshot', name: 'Moonshot AI / Kimi', status: 'operational', models: ['moonshot-v1-128k'], capabilities: ['Text', 'Streaming'] },
    { id: '01ai', name: '01.AI / Yi', status: 'operational', models: ['yi-34b-chat'], capabilities: ['Text', 'Streaming'] },
    { id: 'minimax', name: 'MiniMax', status: 'operational', models: ['abab6.5-chat'], capabilities: ['Text', 'Streaming'] },
  ]},
  { name: 'Local / Self-Hosted', desc: 'Run models on your own infrastructure', providers: [
    { id: 'ollama-cloud', name: 'Ollama Cloud', status: 'operational', models: ['gemma4:31b', 'gpt-oss:20b'], capabilities: ['Text', 'Streaming'] },
    { id: 'ollama', name: 'Ollama (Local)', status: 'operational', models: ['llama3', 'mistral', 'gemma2'], capabilities: ['Text', 'Streaming'] },
  ]},
];

export default function ProvidersPage() {
  const total = categories.reduce((s, c) => s + c.providers.length, 0);
  return (
    <div>
      <h1 id="providers" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Providers</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>{total} providers. 80+ models. One API.</p>

      {categories.map(cat => (
        <div key={cat.name} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fafafa', marginBottom: 4 }}>{cat.name}</h2>
          <p style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 12 }}>{cat.desc}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cat.providers.map(p => (
              <Link key={p.id} href={`/docs/providers/${p.id}`} style={{ display: 'block', padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#22c55e40')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#27272a')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#fafafa' }}>{p.name}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#22c55e' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
                    </span>
                  </div>
                  <span style={{ color: '#52525b', fontSize: 12 }}>→</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {p.models.slice(0, 4).map(m => (
                    <span key={m} style={{ padding: '2px 6px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa', borderRadius: 3 }}>{m}</span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
