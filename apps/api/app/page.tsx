'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { product } from '../lib/product';
import {
  demoMetrics, demoRoutingCandidates, demoRouteDecision,
  demoOptimizerScore, demoSimulator, demoTrace, demoQuota, demoPolicy,
} from '../lib/demo';

// ── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: '#09090b', card: '#0f0f12', elevated: '#18181b',
  border: '#27272a', borderSubtle: '#1c1c1f',
  text: '#fafafa', muted: '#a1a1aa', dim: '#52525b',
  accent: '#22c55e', accentDim: '#16a34a',
  cyan: '#06b6d4', red: '#ef4444', amber: '#f59e0b',
  font: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', 'SF Mono', monospace",
};

// ── Hooks ───────────────────────────────────────────────────────────────────
function useRealtimeMetrics() {
  const [m, setM] = useState({ ...demoMetrics });
  useEffect(() => {
    const iv = setInterval(() => {
      setM(p => ({
        ...p,
        requests: p.requests + Math.floor(Math.random() * 3) + 1,
        tokens: p.tokens + Math.floor(Math.random() * 800) + 200,
        cost: +(p.cost + Math.random() * 0.02).toFixed(2),
        cacheHits: p.cacheHits + Math.floor(Math.random() * 2),
        avgLatency: Math.max(600, Math.min(1200, p.avgLatency + (Math.random() - 0.5) * 40)),
        requestsPerMin: Math.max(30, Math.min(80, p.requestsPerMin + (Math.random() - 0.5) * 6)),
      }));
    }, 2500);
    return () => clearInterval(iv);
  }, []);
  return m;
}

function useAnimatedNumber(target: number, dur = 600) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const s = prev.current, d = target - s;
    if (Math.abs(d) < 0.01) return;
    const t0 = performance.now();
    const anim = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setV(s + d * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(anim); else prev.current = target;
    };
    requestAnimationFrame(anim);
  }, [target, dur]);
  return v;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ── Navbar ──────────────────────────────────────────────────────────────────
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav role="navigation" aria-label="Main navigation" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(9,9,11,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px) saturate(1.2)' : 'none',
      borderBottom: scrolled ? `1px solid ${T.borderSubtle}` : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <a href="/" aria-label="Bifrost home" style={{ fontSize: 15, fontWeight: 800, color: T.text, letterSpacing: '-0.02em', textDecoration: 'none', fontFamily: T.mono }}>BIFROST</a>
          <div className="nav-links" style={{ display: 'flex', gap: 24 }}>
            {['Product', 'Developers', 'Docs'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} style={{ fontSize: 13, color: T.muted, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                {item}
              </a>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="nav-actions">
          <a href="/login" style={{ fontSize: 13, color: T.muted, textDecoration: 'none', padding: '6px 12px', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            Sign in
          </a>
          <a href="/signup" style={{ fontSize: 13, fontWeight: 600, color: T.bg, background: T.text, textDecoration: 'none', padding: '7px 16px', borderRadius: 6, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────
function Hero() {
  const metrics = useRealtimeMetrics();
  const reqNum = useAnimatedNumber(metrics.requests, 600);
  const tokNum = useAnimatedNumber(metrics.tokens, 600);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setActiveStep(p => (p + 1) % product.pipeline.length), 700);
    return () => clearInterval(iv);
  }, []);

  return (
    <section aria-label="Hero" style={{ paddingTop: 120, paddingBottom: 80, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${T.borderSubtle} 1px, transparent 1px), linear-gradient(90deg, ${T.borderSubtle} 1px, transparent 1px)`, backgroundSize: '60px 60px', opacity: 0.3 }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 800px 600px at 50% 30%, rgba(34,197,94,0.06), transparent)' }} />

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 20, marginBottom: 24 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, boxShadow: `0 0 8px ${T.accent}` }} />
            <span style={{ fontSize: 11, color: T.muted, fontFamily: T.mono }}>{metrics.requestsPerMin} req/min</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 5vw, 64px)', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, margin: '0 0 16px', color: T.text }}>
            One API for every model.
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 22px)', color: T.muted, maxWidth: 640, margin: '0 auto 12px', lineHeight: 1.5 }}>
            {product.subline}
          </p>
          <p style={{ fontSize: 14, color: T.dim, maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.7 }}>
            {product.longDescription}
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/signup" style={{ padding: '10px 24px', background: T.text, color: T.bg, fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 6, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              Start Building
            </a>
            <a href="#architecture" style={{ padding: '10px 24px', background: 'transparent', color: T.muted, fontSize: 14, border: `1px solid ${T.border}`, textDecoration: 'none', borderRadius: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.dim; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
              View Architecture
            </a>
          </div>
        </div>

        {/* Pipeline animation */}
        <div id="architecture" style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: '32px 24px', marginBottom: 48 }}>
          <div role="img" aria-label="Bifrost execution pipeline visualization" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
            {product.pipeline.map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{
                  padding: '6px 12px', fontSize: 11, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.04em',
                  background: i === activeStep ? `${T.accent}18` : i < activeStep ? `${T.accent}08` : 'transparent',
                  border: `1px solid ${i === activeStep ? T.accent : i < activeStep ? `${T.accent}40` : T.border}`,
                  color: i === activeStep ? T.accent : i < activeStep ? `${T.accent}aa` : T.dim,
                  borderRadius: 4, transition: 'all 0.3s ease',
                }}>
                  {step}
                </div>
                {i < product.pipeline.length - 1 && (
                  <span style={{ color: i < activeStep ? T.accent : T.dim, fontSize: 10, transition: 'color 0.3s' }}>→</span>
                )}
              </div>
            ))}
          </div>

          {/* Code panel + Decision */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 900, margin: '0 auto' }}>
            <div style={{ background: T.bg, border: `1px solid ${T.borderSubtle}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Request</div>
              <pre style={{ fontSize: 12, fontFamily: T.mono, color: T.muted, lineHeight: 1.6, margin: 0, overflowX: 'auto' }}>
{`POST /v1/chat/completions

{
  "model": "bifrost/auto",
  "messages": [{
    "role": "user",
    "content": "Analyze this codebase..."
  }]
}`}
              </pre>
            </div>
            <div style={{ background: T.bg, border: `1px solid ${T.borderSubtle}`, borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bifrost Decision</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12, fontFamily: T.mono }}>
                <span style={{ color: T.dim }}>Model</span><span style={{ color: T.text }}>Claude Sonnet 4</span>
                <span style={{ color: T.dim }}>Provider</span><span style={{ color: T.text }}>Anthropic</span>
                <span style={{ color: T.dim }}>Route score</span><span style={{ color: T.accent }}>94</span>
                <span style={{ color: T.dim }}>Compression</span><span style={{ color: T.cyan }}>31%</span>
                <span style={{ color: T.dim }}>Cache</span><span style={{ color: T.amber }}>MISS</span>
                <span style={{ color: T.dim }}>Latency</span><span style={{ color: T.text }}>842ms</span>
                <span style={{ color: T.dim }}>Cost</span><span style={{ color: T.text }}>$0.018</span>
              </div>
            </div>
          </div>
        </div>

        {/* Metric strip */}
        <div role="region" aria-label="Key metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: T.borderSubtle, borderRadius: 8, overflow: 'hidden' }}>
          {[
            { label: 'Providers', value: '14+', color: T.text },
            { label: 'Token Reduction', value: `${demoMetrics.compressionRate.toFixed(1)}%`, color: T.cyan },
            { label: 'Cache Hit Rate', value: `${((metrics.cacheHits / metrics.requests) * 100).toFixed(1)}%`, color: T.accent },
            { label: 'Routing Reliability', value: `${demoMetrics.uptime}%`, color: T.accent },
          ].map((item, i) => (
            <div key={i} style={{ background: T.card, padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, fontFamily: T.mono, color: item.color, letterSpacing: '-0.02em' }}>{item.value}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Core Capabilities ───────────────────────────────────────────────────────
function Capabilities() {
  const { ref, visible } = useInView();
  return (
    <section id="product" ref={ref} aria-label="Core capabilities" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          AI infrastructure should optimize itself.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Bifrost handles routing, optimization, caching, recovery, control, and observability — so your application can focus on product.
        </p>
        <div role="list" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 1000, margin: '0 auto' }}>
          {product.features.map((f, i) => (
            <div key={f.id} role="listitem" style={{
              background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24,
              opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)',
              transition: `all 0.5s ease ${i * 0.08}s`,
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${T.accent}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${T.accent}10`, borderRadius: 6, marginBottom: 14, fontSize: 14, color: T.accent, fontFamily: T.mono, fontWeight: 700 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>{f.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Provider Network ────────────────────────────────────────────────────────
function Providers() {
  return (
    <section id="providers" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Your models. One gateway.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.6 }}>
          No provider lock-in. No application rewrites. Add any OpenAI-compatible endpoint.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
          {product.providers.map((p, i) => (
            <div key={i} style={{ padding: '8px 16px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, fontSize: 13, color: T.muted, transition: 'all 0.15s', cursor: 'default' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
              {p.name}
            </div>
          ))}
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            {['YOUR APPLICATION', 'BIFROST API', 'MULTIPLE PROVIDERS', 'MULTIPLE ACCOUNTS'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ padding: '8px 20px', background: i === 1 ? `${T.accent}15` : T.elevated, border: `1px solid ${i === 1 ? T.accent : T.border}`, borderRadius: 4, fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: i === 1 ? T.accent : T.muted, letterSpacing: '0.04em' }}>
                  {step}
                </div>
                {i < 3 && <span style={{ color: T.dim, fontSize: 10 }}>↓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Optimization ────────────────────────────────────────────────────────────
function Optimization() {
  const { ref, visible } = useInView(0.2);
  const [bar1, setBar1] = useState(0);
  const [bar2, setBar2] = useState(0);
  useEffect(() => {
    if (visible) { setTimeout(() => setBar1(100), 200); setTimeout(() => setBar2(65), 600); }
  }, [visible]);

  return (
    <section id="optimization" ref={ref} style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Stop paying to repeat yourself.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Bifrost compresses prompts, deduplicates tool output, and preserves recoverable context.
        </p>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: T.mono, marginBottom: 6 }}>
              <span style={{ color: T.dim }}>ORIGINAL CONTEXT</span>
              <span style={{ color: T.muted }}>48,200 tokens</span>
            </div>
            <div style={{ height: 24, background: T.elevated, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar1}%`, background: `linear-gradient(90deg, ${T.border}, ${T.muted})`, borderRadius: 4, transition: 'width 0.8s ease' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: T.accent, fontFamily: T.mono, fontWeight: 600, letterSpacing: '0.06em' }}>BIFROST OPTIMIZER</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['Deduplication', 'Boilerplate normalization', 'Structural compression', 'Context pruning', 'Tool output compression'].map(f => (
                  <span key={f} style={{ fontSize: 11, color: T.dim, fontFamily: T.mono, padding: '3px 8px', background: T.elevated, border: `1px solid ${T.borderSubtle}`, borderRadius: 3 }}>{f}</span>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: T.mono, marginBottom: 6 }}>
              <span style={{ color: T.dim }}>OPTIMIZED CONTEXT</span>
              <span style={{ color: T.accent }}>31,400 tokens</span>
            </div>
            <div style={{ height: 24, background: T.elevated, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${bar2}%`, background: `linear-gradient(90deg, ${T.accentDim}, ${T.accent})`, borderRadius: 4, transition: 'width 1s ease 0.4s' }} />
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '20px 0', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
            <div style={{ fontSize: 32, fontWeight: 800, fontFamily: T.mono, color: T.accent, letterSpacing: '-0.02em' }}>34.8% fewer tokens</div>
            <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Demonstration values — actual compression varies by request</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
            {['Prompt Compression', 'Tool Output Compression', 'Semantic Cache', 'Recoverable Context', 'Context Dependency Graph', 'Context Garbage Collection'].map(f => (
              <div key={f} style={{ padding: '10px 14px', background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, fontSize: 12, color: T.muted, fontFamily: T.mono }}>
                <span style={{ color: T.accent, marginRight: 6 }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Routing ─────────────────────────────────────────────────────────────────
function Routing() {
  const [selected, setSelected] = useState(0);
  return (
    <section id="routing" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Never depend on one model.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Bifrost evaluates candidates on capability, quality, latency, cost, and health — then picks the winner.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, maxWidth: 900, margin: '0 auto' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {demoRoutingCandidates.map((c, i) => (
                <div key={i} role="button" tabIndex={0} aria-label={`Route candidate: ${c.name}`}
                  onClick={() => setSelected(i)} onKeyDown={e => e.key === 'Enter' && setSelected(i)}
                  style={{
                    padding: '14px 18px', background: i === selected ? `${T.accent}08` : T.card,
                    border: `1px solid ${i === selected ? T.accent : T.border}`, borderRadius: 8,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (i !== selected) e.currentTarget.style.borderColor = T.dim; }}
                  onMouseLeave={e => { if (i !== selected) e.currentTarget.style.borderColor = T.border; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: i === selected ? T.accent : T.text }}>{c.name}</span>
                      <span style={{ fontSize: 11, color: T.dim, marginLeft: 8 }}>{c.provider}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: T.mono, color: i === selected ? T.accent : T.muted }}>{c.score}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    {[['Cap', c.capability], ['Quality', c.quality], ['Latency', c.latency], ['Cost', c.cost]].map(([l, v]) => (
                      <div key={String(l)} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase' }}>{String(l)}</div>
                        <div style={{ fontSize: 11, fontFamily: T.mono, color: T.muted }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24, position: 'sticky', top: 100 }}>
              <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>WHY {demoRoutingCandidates[selected].name.split(' ')[0]}?</div>
              {demoRouteDecision.factors.map((r, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: T.dim }}>{r.label}</span>
                    <span style={{ fontFamily: T.mono, color: r.value.startsWith('+') ? T.accent : T.red }}>{r.value}</span>
                  </div>
                  <div style={{ height: 3, background: T.elevated, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.pct}%`, background: r.value.startsWith('+') ? T.accent : T.red, borderRadius: 2, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.borderSubtle}`, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: T.dim, fontFamily: T.mono }}>ROUTE SCORE</span>
                <span style={{ fontSize: 16, fontWeight: 700, fontFamily: T.mono, color: T.accent }}>{demoRoutingCandidates[selected].score}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Optimizer Score ─────────────────────────────────────────────────────────
function OptimizerScore() {
  const { ref, visible } = useInView(0.2);
  return (
    <section ref={ref} style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 12px', color: T.text }}>
          Bifrost Optimizer Score
        </h2>
        <p style={{ fontSize: 15, color: T.muted, maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.6 }}>
          A composite measure of how well Bifrost is optimizing your requests.
        </p>
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: '40px 60px' }}>
          <div style={{ fontSize: 64, fontWeight: 800, fontFamily: T.mono, color: T.accent, letterSpacing: '-0.03em', lineHeight: 1 }}>
            {demoOptimizerScore.total}
          </div>
          <div style={{ fontSize: 14, color: T.dim, marginTop: 4, marginBottom: 32 }}>/ 100</div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {demoOptimizerScore.breakdown.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: T.dim, width: 120, textAlign: 'right' }}>{b.label}</span>
                <div style={{ flex: 1, height: 6, background: T.elevated, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: visible ? `${b.value}%` : '0%', background: T.accent, borderRadius: 3, transition: `width 0.8s ease ${i * 0.1}s` }} />
                </div>
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.muted, width: 30 }}>{b.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Reliability ─────────────────────────────────────────────────────────────
function Reliability() {
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    { label: 'REQUEST', color: T.text },
    { label: 'PROVIDER A', color: T.text },
    { label: 'TIMEOUT', color: T.red },
    { label: 'CIRCUIT BREAKER', color: T.amber },
    { label: 'PROVIDER B', color: T.text },
    { label: 'SUCCESS', color: T.accent },
  ];
  useEffect(() => {
    const iv = setInterval(() => setActiveStep(p => (p + 1) % steps.length), 1200);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="reliability" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          When providers fail, your application shouldn&apos;t.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Automatic fallback, circuit breakers, self-healing, and multi-account rotation.
        </p>
        <div style={{ maxWidth: 700, margin: '0 auto 48px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  padding: '8px 14px', fontSize: 11, fontFamily: T.mono, fontWeight: 600,
                  background: i === activeStep ? `${s.color}18` : 'transparent',
                  border: `1px solid ${i === activeStep ? s.color : T.borderSubtle}`,
                  color: i === activeStep ? s.color : T.dim,
                  borderRadius: 4, transition: 'all 0.3s ease',
                }}>{s.label}</div>
                {i < steps.length - 1 && <span style={{ color: T.dim, fontSize: 10 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
          {product.capabilities.slice(0, 8).map(cap => (
            <div key={cap} style={{ padding: '6px 14px', background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 4, fontSize: 12, color: T.muted }}>{cap}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Context Intelligence ────────────────────────────────────────────────────
function ContextIntelligence() {
  const graph = [
    { label: 'User Request', color: T.accent },
    { label: 'Documents', color: T.cyan },
    { label: 'Tool Results', color: T.amber },
    { label: 'Constraints', color: T.muted },
    { label: 'Errors', color: T.red },
    { label: 'Dependencies', color: T.text },
  ];
  return (
    <section style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Context intelligence, not context deletion.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Bifrost builds a dependency graph of your context, then recovers what it prunes.
        </p>
        <div style={{ maxWidth: 600, margin: '0 auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>CONTEXT DEPENDENCY GRAPH</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {graph.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: T.elevated, borderRadius: 4 }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: g.color }} />
                <span style={{ fontSize: 12, fontFamily: T.mono, color: T.muted }}>{g.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: T.mono, color: T.dim }}>{['required', 'referenced', 'dependent', 'required', 'recoverable', 'referenced'][i]}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ padding: '10px 14px', background: `${T.accent}08`, border: `1px solid ${T.accent}30`, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.accent, fontFamily: T.mono, fontWeight: 600 }}>RECOVERABLE</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Restored on demand</div>
            </div>
            <div style={{ padding: '10px 14px', background: T.elevated, border: `1px solid ${T.borderSubtle}`, borderRadius: 6, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.mono, fontWeight: 600 }}>PRUNED</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Stale / redundant</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Quota Intelligence ──────────────────────────────────────────────────────
function QuotaIntelligence() {
  return (
    <section style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Use every available unit of AI capacity.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Multi-account rotation, quota forecasting, and cost optimization across providers.
        </p>
        <div style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {demoQuota.map((q, i) => (
            <div key={i} style={{ padding: '14px 18px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{q.provider}</span>
                  <span style={{ fontSize: 11, color: T.dim, marginLeft: 8 }}>{q.account}</span>
                </div>
                <span style={{ fontSize: 13, fontFamily: T.mono, color: q.remaining > 50 ? T.accent : q.remaining > 25 ? T.amber : T.red }}>{q.remaining}%</span>
              </div>
              <div style={{ height: 4, background: T.elevated, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${q.remaining}%`, background: q.remaining > 50 ? T.accent : q.remaining > 25 ? T.amber : T.red, borderRadius: 2, transition: 'width 0.5s ease' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 32 }}>
          {['Quota Forecasting', 'Multi-Account Rotation', 'Cost Optimization', 'Spend Guardrails', 'Quota Marketplace'].map(f => (
            <div key={f} style={{ padding: '6px 14px', background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 4, fontSize: 12, color: T.muted }}>{f}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Policy ──────────────────────────────────────────────────────────────────
function Policy() {
  const [showYaml, setShowYaml] = useState(false);
  const yaml = `policy: production-coding
when:
  tag: coding
  environment: production
require:
  tools: true
  structured_output: true
  residency: eu
limit:
  max_cost: $0.03
  max_latency: 2000ms
prefer:
  quality: high
fallback: automatic`;

  return (
    <section id="policy" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Put your AI infrastructure on policy.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Policy-as-code. Data residency. Tenant isolation. Spend guardrails.
        </p>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setShowYaml(false)} style={{ padding: '6px 14px', fontSize: 12, fontFamily: T.mono, background: !showYaml ? T.elevated : 'transparent', border: `1px solid ${!showYaml ? T.border : T.borderSubtle}`, color: !showYaml ? T.text : T.dim, borderRadius: 4, cursor: 'pointer' }}>Visual</button>
            <button onClick={() => setShowYaml(true)} style={{ padding: '6px 14px', fontSize: 12, fontFamily: T.mono, background: showYaml ? T.elevated : 'transparent', border: `1px solid ${showYaml ? T.border : T.borderSubtle}`, color: showYaml ? T.text : T.dim, borderRadius: 4, cursor: 'pointer' }}>YAML</button>
          </div>
          {showYaml ? (
            <div style={{ background: T.bg, border: `1px solid ${T.borderSubtle}`, borderRadius: 8, padding: 20 }}>
              <pre style={{ fontSize: 12, fontFamily: T.mono, color: T.muted, lineHeight: 1.7, margin: 0, overflowX: 'auto' }}>{yaml}</pre>
            </div>
          ) : (
            <div style={{ background: T.card, border: `1px solid ${T.borderSubtle}`, borderRadius: 10, padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 16 }}>{demoPolicy.name}</div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>WHEN</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {demoPolicy.when.map(w => (
                    <span key={w.key} style={{ padding: '4px 10px', background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 4, fontSize: 12, color: T.muted, fontFamily: T.mono }}>{w.key} = {w.value}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>REQUIRE</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {demoPolicy.require.map(r => (
                    <span key={r} style={{ padding: '4px 10px', background: `${T.accent}10`, border: `1px solid ${T.accent}30`, borderRadius: 4, fontSize: 12, color: T.accent, fontFamily: T.mono }}>✓ {r}</span>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>LIMIT</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {demoPolicy.limit.map(l => (
                    <span key={l.key} style={{ padding: '4px 10px', background: `${T.amber}10`, border: `1px solid ${T.amber}30`, borderRadius: 4, fontSize: 12, color: T.amber, fontFamily: T.mono }}>{l.key} = {l.value}</span>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>PREFER</div>
                <span style={{ padding: '4px 10px', background: `${T.cyan}10`, border: `1px solid ${T.cyan}30`, borderRadius: 4, fontSize: 12, color: T.cyan, fontFamily: T.mono }}>{demoPolicy.prefer[0]}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Observability ───────────────────────────────────────────────────────────
function Observability() {
  const [log, setLog] = useState<Array<{ id: string; model: string; provider: string; latency: number; tokens: number; status: string; time: string }>>([]);
  const idRef = useRef(0);
  useEffect(() => {
    const models = ['Claude Sonnet 4', 'GPT-4o', 'Gemini 2.5 Flash', 'Llama 3.3 70B', 'Mistral Large'];
    const providers = ['Anthropic', 'OpenAI', 'Google', 'Groq', 'Mistral'];
    const add = () => {
      const idx = Math.floor(Math.random() * models.length);
      setLog(p => [{
        id: `req_${++idRef.current}`, model: models[idx], provider: providers[idx],
        latency: Math.floor(Math.random() * 600) + 400, tokens: Math.floor(Math.random() * 800) + 100,
        status: Math.random() > 0.1 ? '200' : '429',
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }, ...p].slice(0, 10));
    };
    add();
    const iv = setInterval(add, 3000);
    return () => clearInterval(iv);
  }, []);

  return (
    <section id="observability" style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Every decision is explainable.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Trace every routing decision, token usage, fallback, and cost in real time.
        </p>
        <div style={{ maxWidth: 800, margin: '0 auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSubtle}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, boxShadow: `0 0 6px ${T.accent}` }} />
            <span style={{ fontSize: 11, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Request Stream</span>
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 11 }}>
            {log.map((l, i) => (
              <div key={l.id} style={{
                padding: '8px 16px', borderBottom: `1px solid ${T.borderSubtle}`,
                display: 'grid', gridTemplateColumns: '70px 1fr 100px 80px 60px 50px',
                gap: 8, alignItems: 'center', opacity: i === 0 ? 1 : Math.max(0.3, 1 - i * 0.08),
                background: i === 0 ? `${T.accent}06` : 'transparent', transition: 'opacity 0.3s',
              }}>
                <span style={{ color: T.dim }}>{l.time}</span>
                <span style={{ color: T.text }}>{l.model}</span>
                <span style={{ color: T.dim }}>{l.provider}</span>
                <span style={{ color: l.latency < 600 ? T.accent : l.latency < 900 ? T.cyan : T.amber }}>{l.latency}ms</span>
                <span style={{ color: T.dim }}>{l.tokens}t</span>
                <span style={{ color: l.status === '200' ? T.accent : T.red }}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Request Trace ───────────────────────────────────────────────────────────
function RequestTrace() {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <section style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Full request trace.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Expand every step. See exactly what Bifrost did and why.
        </p>
        <div style={{ maxWidth: 500, margin: '0 auto', background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {demoTrace.map((t, i) => (
            <div key={i} role="button" tabIndex={0}
              onClick={() => setExpanded(expanded === i ? null : i)}
              onKeyDown={e => e.key === 'Enter' && setExpanded(expanded === i ? null : i)}
              style={{ padding: '10px 16px', borderBottom: i < demoTrace.length - 1 ? `1px solid ${T.borderSubtle}` : 'none', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.elevated)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.status === 'ok' ? T.accent : t.status === 'miss' ? T.amber : T.red }} />
                  <span style={{ fontSize: 12, fontFamily: T.mono, color: T.text }}>{t.step}</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: T.mono, color: T.dim }}>{t.latency}</span>
              </div>
              {expanded === i && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: T.bg, borderRadius: 4, fontSize: 11, fontFamily: T.mono, color: T.muted }}>
                  Status: {t.status} · Latency: {t.latency} · Step {i + 1} of {demoTrace.length}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── What-If Simulator ───────────────────────────────────────────────────────
function Simulator() {
  return (
    <section style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 40px)', fontWeight: 700, letterSpacing: '-0.02em', textAlign: 'center', margin: '0 0 12px', color: T.text }}>
          Know what a routing change will cost before you ship it.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, textAlign: 'center', maxWidth: 520, margin: '0 auto 56px', lineHeight: 1.6 }}>
          Simulate policy changes and compare cost, latency, and provider distribution.
        </p>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[demoSimulator.current, demoSimulator.proposed].map((pol, i) => (
            <div key={i} style={{ background: T.card, border: `1px solid ${i === 1 ? `${T.accent}40` : T.border}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 600, color: i === 1 ? T.accent : T.muted, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{pol.label}</div>
              {[
                ['Cost', `$${pol.cost.toLocaleString()}`],
                ['Latency', `${pol.latency}s`],
                ['Failure rate', `${pol.failureRate}%`],
                ['Tokens', `${pol.tokens}M`],
              ].map(([l, v]) => (
                <div key={String(l)} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.borderSubtle}` }}>
                  <span style={{ fontSize: 12, color: T.dim }}>{String(l)}</span>
                  <span style={{ fontSize: 12, fontFamily: T.mono, color: T.text }}>{String(v)}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, fontSize: 10, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Provider distribution</div>
              {pol.providers.map((p, j) => (
                <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.dim, width: 70 }}>{p.name}</span>
                  <div style={{ flex: 1, height: 4, background: T.elevated, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.pct}%`, background: T.accent, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: T.mono, color: T.muted, width: 30 }}>{p.pct}%</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: T.dim, fontFamily: T.mono }}>Demonstration values — not production metrics</div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────────────
function FinalCTA() {
  const metrics = useRealtimeMetrics();
  return (
    <section style={{ padding: '96px 0', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 16px', color: T.text }}>
          Build on one API.<br />Let Bifrost handle the rest.
        </h2>
        <p style={{ fontSize: 15, color: T.muted, maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.6 }}>
          Connect your models once. Let Bifrost optimize routing, context, cost, reliability, and execution automatically.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/signup" style={{ padding: '11px 28px', background: T.text, color: T.bg, fontSize: 14, fontWeight: 600, textDecoration: 'none', borderRadius: 6, transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
            Start Building
          </a>
          <a href="/docs" style={{ padding: '11px 28px', background: 'transparent', color: T.muted, fontSize: 14, border: `1px solid ${T.border}`, textDecoration: 'none', borderRadius: 6, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.dim; e.currentTarget.style.color = T.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.muted; }}>
            Read the Docs
          </a>
        </div>
        <div role="region" aria-label="Live statistics" style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mono, color: T.text }}>{metrics.requests.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Total Requests</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mono, color: T.cyan }}>{(metrics.tokens / 1000000).toFixed(2)}M</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Tokens Processed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: T.mono, color: T.accent }}>${metrics.cost.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>Total Cost</div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────────
function Footer() {
  const companyLinks = [
    { label: 'About', href: 'https://omixsystems.store' },
    { label: 'Blog', href: 'https://blog.omixsystems.store' },
    { label: 'Status', href: 'https://blog.omixsystems.store' },
    { label: 'Contact', href: 'mailto:omixsystems@gmail.com' },
  ];
  const productLinks = [
    { label: 'Gateway', href: '#architecture' },
    { label: 'Routing', href: '#routing' },
    { label: 'Optimization', href: '#optimization' },
    { label: 'Reliability', href: '#reliability' },
    { label: 'Observability', href: '#observability' },
  ];
  const devLinks = [
    { label: 'API Reference', href: '/docs/api' },
    { label: 'Documentation', href: '/docs' },
    { label: 'Quickstart', href: '/docs/quickstart' },
    { label: 'Providers', href: '/docs/providers' },
    { label: 'OpenAPI', href: '/openapi.json' },
  ];
  const enterpriseLinks = [
    { label: 'Policies', href: '#policy' },
    { label: 'Tenants', href: '#policy' },
    { label: 'Security', href: '#policy' },
    { label: 'Data Residency', href: '#policy' },
  ];

  return (
    <footer role="contentinfo" style={{ padding: '64px 0 40px', borderTop: `1px solid ${T.borderSubtle}` }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr repeat(4, 1fr)', gap: 40, marginBottom: 48 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: T.text, fontFamily: T.mono, marginBottom: 8 }}>BIFROST</div>
            <div style={{ fontSize: 13, color: T.dim, lineHeight: 1.6 }}>The intelligent execution layer for AI.</div>
            <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.6, marginTop: 8 }}>100% free. No hidden costs.</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Product</div>
            {productLinks.map(l => (
              <a key={l.label} href={l.href} style={{ display: 'block', fontSize: 13, color: T.dim, marginBottom: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>
                {l.label}
              </a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Developers</div>
            {devLinks.map(l => (
              <a key={l.label} href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} style={{ display: 'block', fontSize: 13, color: T.dim, marginBottom: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>
                {l.label}
              </a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Enterprise</div>
            {enterpriseLinks.map(l => (
              <a key={l.label} href={l.href} style={{ display: 'block', fontSize: 13, color: T.dim, marginBottom: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>
                {l.label}
              </a>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Company</div>
            {companyLinks.map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 13, color: T.dim, marginBottom: 8, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>
                {l.label}
              </a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${T.borderSubtle}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: T.dim }}>&copy; 2026 Bifrost by OMIX Digital Solutions. Built in Kenya.</span>
          <span style={{ fontSize: 12, color: T.dim, fontFamily: T.mono }}>v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: T.font, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${T.bg}; color: ${T.text}; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-actions a:first-child { display: none !important; }
        }
        @media (max-width: 640px) {
          #architecture > div:last-child { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
        @media (max-width: 768px) {
          section > div > div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="grid-template-columns: 1fr 340px"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          section > div > div[style*="grid-template-columns: repeat(4"] { grid-template-columns: repeat(2, 1fr) !important; }
          footer > div > div[style*="grid-template-columns: 2fr repeat(4"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <Navbar />
      <Hero />
      <Capabilities />
      <Providers />
      <Optimization />
      <Routing />
      <OptimizerScore />
      <Reliability />
      <ContextIntelligence />
      <QuotaIntelligence />
      <Policy />
      <Observability />
      <RequestTrace />
      <Simulator />
      <FinalCTA />
      <Footer />
    </div>
  );
}
