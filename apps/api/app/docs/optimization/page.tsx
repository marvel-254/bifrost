import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Optimization', description: 'Prompt compression, caching, and context optimization.' };

export default function OptimizationPage() {
  return (
    <div>
      <h1 id="optimization" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Optimization</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 24, lineHeight: 1.6 }}>Stop paying to repeat yourself. Bifrost compresses, deduplicates, and caches.</p>

      <h2 id="how-optimization-works" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>How optimization works</h2>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <div style={{ padding: '8px 20px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#a1a1aa', background: '#18181b', border: '1px solid #27272a', borderRadius: 4 }}>48,200 tokens</div>
          <span style={{ color: '#52525b' }}>↓</span>
          <div style={{ padding: '8px 20px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', background: '#22c55e18', border: '1px solid #22c55e40', borderRadius: 4 }}>BIFROST OPTIMIZER</div>
          <span style={{ color: '#52525b' }}>↓</span>
          <div style={{ padding: '8px 20px', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e', background: '#18181b', border: '1px solid #27272a', borderRadius: 4 }}>31,400 tokens</div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, fontWeight: 700, color: '#22c55e' }}>34.8% fewer tokens</div>
      </div>

      <h2 id="capabilities" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Capabilities</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { title: 'Prompt Compression', desc: 'Reduce token count while preserving intent and constraints.' },
          { title: 'Tool Output Compression', desc: 'Deduplicate and normalize repetitive tool results.' },
          { title: 'Semantic Cache', desc: 'Reuse previous work via embedding similarity.' },
          { title: 'Recoverable Context', desc: 'Prune aggressively, restore on demand.' },
          { title: 'Context Dependency Graph', desc: 'Map relationships between context elements.' },
          { title: 'Context Garbage Collection', desc: 'Remove stale and redundant context.' },
        ].map(c => (
          <div key={c.title} style={{ padding: 16, background: '#0f0f12', border: '1px solid #27272a', borderRadius: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', marginBottom: 4 }}>{c.title}</div>
            <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>

      <h2 id="recoverable-context" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Recoverable Context</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Bifrost doesn&apos;t blindly delete context. It determines what can be safely compressed, pruned,
        or moved into recoverable storage. If a model needs pruned context, Bifrost can restore it.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: 14, background: '#22c55e08', border: '1px solid #22c55e30', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#22c55e', fontFamily: "'JetBrains Mono', monospace" }}>RECOVERABLE</div>
          <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>Restored on demand</div>
        </div>
        <div style={{ padding: 14, background: '#18181b', border: '1px solid #27272a', borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#a1a1aa', fontFamily: "'JetBrains Mono', monospace" }}>PRUNED</div>
          <div style={{ fontSize: 11, color: '#52525b', marginTop: 4 }}>Stale / redundant</div>
        </div>
      </div>
    </div>
  );
}
