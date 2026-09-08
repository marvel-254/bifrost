'use client';

export default function ConceptsPage() {
  return (
    <div>
      <h1 id="concepts" style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>Core Concepts</h1>
      <p style={{ fontSize: 15, color: '#a1a1aa', marginBottom: 32, lineHeight: 1.6 }}>Understand how Bifrost works.</p>

      <h2 id="execution-layer" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Execution Layer</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
        Bifrost is an intelligent AI execution layer. It sits between your application and AI model providers.
        When your application sends a request, Bifrost understands it, optimizes it, selects the best route,
        executes it, validates the response, and recovers from failures automatically.
      </p>

      <h2 id="bifrost-auto" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>bifrost/auto</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
        Use <code style={{ fontFamily: "'JetBrains Mono', monospace", background: '#18181b', padding: '2px 6px', borderRadius: 3 }}>"bifrost/auto"</code> as the model ID to let Bifrost automatically select the optimal model and provider.
        The routing engine considers capability, cost, latency, health, and quota to make the decision.
      </p>

      <h2 id="routing-engine" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Routing Engine</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 16, lineHeight: 1.6 }}>
        Every routing decision is explainable. Bifrost scores candidates on multiple factors:
      </p>
      <div style={{ background: '#0f0f12', border: '1px solid #27272a', borderRadius: 10, padding: 20, marginBottom: 24, maxWidth: 400 }}>
        <div style={{ fontSize: 10, color: '#52525b', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Route Decision</div>
        {[
          ['Capability match', '+22', 88],
          ['Historical quality', '+18', 72],
          ['Provider health', '+15', 60],
          ['Latency prediction', '+12', 48],
          ['Quota availability', '+8', 32],
          ['Cost', '-3', 12],
        ].map(([label, value, pct]) => (
          <div key={String(label)} style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
              <span style={{ color: '#52525b' }}>{String(label)}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: String(value).startsWith('+') ? '#22c55e' : '#ef4444' }}>{String(value)}</span>
            </div>
            <div style={{ height: 3, background: '#18181b', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: String(value).startsWith('+') ? '#22c55e' : '#ef4444', borderRadius: 2 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #1c1c1f', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: '#52525b', fontFamily: "'JetBrains Mono', monospace" }}>ROUTE SCORE</span>
          <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: '#22c55e' }}>82</span>
        </div>
      </div>

      <h2 id="optimization" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Optimization</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
        Bifrost compresses prompts, deduplicates tool output, and uses semantic caching to reduce token usage.
        Compression preserves intent, constraints, and required context.
      </p>

      <h2 id="reliability" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Reliability</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
        When a provider fails, Bifrost automatically retries, fails over to another provider, and opens a circuit breaker
        to prevent repeated failures. Your application stays up.
      </p>

      <h2 id="openai-compatible" style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>OpenAI Compatible</h2>
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.6 }}>
        Bifrost is a drop-in replacement for OpenAI. Use any OpenAI-compatible SDK, client, or framework.
        Just point the base URL to Bifrost.
      </p>
    </div>
  );
}
