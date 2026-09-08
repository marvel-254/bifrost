'use client';
import Link from 'next/link';

export default function HuggingFaceProviderPage() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#22c55e' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} /> Operational
        </span>
      </div>
      <h1 id="huggingface" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>HuggingFace</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Access open-source models via HuggingFace Inference API.</p>

      <h2 id="models" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Models</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {['llama-3.3-70b'].map(m => (
          <div key={m} style={{ padding: '10px 14px', background: '#0f0f12', border: '1px solid #27272a', borderRadius: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fafafa' }}>{m}</div>
        ))}
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['Text', 'Streaming'].map(c => (
          <span key={c} style={{ padding: '4px 10px', fontSize: 12, background: '#22c55e10', border: '1px solid #22c55e30', color: '#22c55e', borderRadius: 4 }}>✓ {c}</span>
        ))}
      </div>

      <h2 id="configuration" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Configuration</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8, padding: 16 }}>
        <pre style={{ margin: 0, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', lineHeight: 1.7 }}>
{`Environment variable:
HUGGINGFACE_API_KEY=hf_...

Or configure via dashboard:
Dashboard → Provider Keys → Add Key → huggingface`}
        </pre>
      </div>
    </div>
  );
}
