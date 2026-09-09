'use client';
import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// ── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  bg: '#09090b', card: '#0f0f12', elevated: '#18181b',
  border: '#27272a', borderSubtle: '#1c1c1f',
  text: '#fafafa', muted: '#a1a1aa', dim: '#52525b',
  accent: '#22c55e', cyan: '#06b6d4', red: '#ef4444', amber: '#f59e0b',
  font: "'Inter', -apple-system, sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ── Sidebar data ────────────────────────────────────────────────────────────
interface SidebarItem { label: string; href: string; }
interface SidebarGroup { title: string; items: SidebarItem[]; }

const sidebarData: SidebarGroup[] = [
  { title: 'GETTING STARTED', items: [
    { label: 'Introduction', href: '/docs' },
    { label: 'Quickstart', href: '/docs/quickstart' },
    { label: 'Concepts', href: '/docs/concepts' },
  ]},
  { title: 'API', items: [
    { label: 'API Overview', href: '/docs/api' },
    { label: 'Authentication', href: '/docs/api/authentication' },
    { label: 'Chat Completions', href: '/docs/api/chat-completions' },
    { label: 'Streaming', href: '/docs/api/streaming' },
    { label: 'Models', href: '/docs/api/models' },
    { label: 'Errors', href: '/docs/api/errors' },
  ]},
  { title: 'PROVIDERS', items: [
    { label: 'Provider Overview', href: '/docs/providers' },
    // Core
    { label: 'OpenAI', href: '/docs/providers/openai' },
    { label: 'Anthropic', href: '/docs/providers/anthropic' },
    { label: 'Google', href: '/docs/providers/google' },
    { label: 'Mistral', href: '/docs/providers/mistral' },
    { label: 'DeepSeek', href: '/docs/providers/deepseek' },
    { label: 'Cohere', href: '/docs/providers/cohere' },
    { label: 'AI21 Labs', href: '/docs/providers/ai21' },
    { label: 'xAI / Grok', href: '/docs/providers/xai' },
    // High-perf
    { label: 'Groq', href: '/docs/providers/groq' },
    { label: 'Cerebras', href: '/docs/providers/cerebras' },
    { label: 'SambaNova', href: '/docs/providers/sambanova' },
    { label: 'Nvidia NIM', href: '/docs/providers/nvidia' },
    { label: 'Nscale', href: '/docs/providers/nscale' },
    // Cloud inference
    { label: 'Together AI', href: '/docs/providers/together' },
    { label: 'Fireworks AI', href: '/docs/providers/fireworks' },
    { label: 'DeepInfra', href: '/docs/providers/deepinfra' },
    { label: 'Novita AI', href: '/docs/providers/novita' },
    { label: 'Lepton AI', href: '/docs/providers/lepton' },
    { label: 'Hyperbolic', href: '/docs/providers/hyperbolic' },
    { label: 'Featherless AI', href: '/docs/providers/featherless' },
    { label: 'Mancer', href: '/docs/providers/mancer' },
    // Gateways
    { label: 'OpenRouter', href: '/docs/providers/openrouter' },
    { label: 'Vercel AI Gateway', href: '/docs/providers/vercel-gateway' },
    { label: 'Cloudflare', href: '/docs/providers/cloudflare' },
    { label: 'HuggingFace', href: '/docs/providers/huggingface' },
    // Chinese
    { label: 'Alibaba / Qwen', href: '/docs/providers/qwen' },
    { label: 'Zhipu AI', href: '/docs/providers/zhipu' },
    { label: 'Baidu / ERNIE', href: '/docs/providers/baidu' },
    { label: 'Tencent / Hunyuan', href: '/docs/providers/tencent' },
    { label: 'ByteDance / Doubao', href: '/docs/providers/doubao' },
    { label: 'Moonshot AI', href: '/docs/providers/moonshot' },
    // Local
    { label: 'Ollama Cloud', href: '/docs/providers/ollama-cloud' },
    { label: 'Ollama (Local)', href: '/docs/providers/ollama' },
  ]},
  { title: 'ROUTING', items: [
    { label: 'Auto Routing', href: '/docs/routing' },
  ]},
  { title: 'OPTIMIZATION', items: [
    { label: 'Optimization Overview', href: '/docs/optimization' },
  ]},
  { title: 'RELIABILITY', items: [
    { label: 'Reliability Overview', href: '/docs/reliability' },
  ]},
  { title: 'POLICIES', items: [
    { label: 'Policy-as-Code', href: '/docs/policies' },
  ]},
  { title: 'OBSERVABILITY', items: [
    { label: 'Observability Overview', href: '/docs/observability' },
  ]},
  { title: 'ECONOMICS', items: [
    { label: 'Cost & Quotas', href: '/docs/economics' },
  ]},
  { title: 'REFERENCE', items: [
    { label: 'Architecture', href: '/docs/architecture' },
  ]},
];

// ── Search ──────────────────────────────────────────────────────────────────
const searchIndex = sidebarData.flatMap(g => g.items.map(i => ({ ...i, group: g.title })));

function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 50); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const results = q.trim()
    ? searchIndex.filter(i => i.label.toLowerCase().includes(q.toLowerCase()) || i.href.includes(q.toLowerCase()))
    : searchIndex.slice(0, 8);

  if (!open) return null;
  return (
    <div role="dialog" aria-label="Search documentation" style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
      <div style={{ position: 'relative', width: '100%', maxWidth: 520, background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSubtle}`, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.dim} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search documentation..."
            style={{ flex: 1, background: 'none', border: 'none', color: T.text, fontSize: 14, fontFamily: T.font, outline: 'none' }} />
          <span style={{ fontSize: 11, color: T.dim, fontFamily: T.mono, padding: '2px 6px', background: T.elevated, borderRadius: 3 }}>ESC</span>
        </div>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {results.map((r, i) => (
            <Link key={i} href={r.href} onClick={onClose} style={{ display: 'block', padding: '10px 16px', textDecoration: 'none', borderBottom: `1px solid ${T.borderSubtle}`, transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = T.elevated)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ fontSize: 13, color: T.text }}>{r.label}</div>
              <div style={{ fontSize: 11, color: T.dim, fontFamily: T.mono, marginTop: 2 }}>{r.group} → {r.href}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Docs Header ─────────────────────────────────────────────────────────────
function DocsHeader({ onSearchOpen }: { onSearchOpen: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header role="banner" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 56,
      background: scrolled ? 'rgba(9,9,11,0.92)' : 'rgba(9,9,11,0.98)',
      backdropFilter: 'blur(12px)', borderBottom: `1px solid ${T.borderSubtle}`,
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <Link href="/" style={{ fontSize: 14, fontWeight: 800, color: T.text, fontFamily: T.mono, textDecoration: 'none', letterSpacing: '-0.02em' }}>BIFROST</Link>
          <div style={{ display: 'flex', gap: 20 }} className="docs-nav-links">
            {[
              { label: 'Docs', href: '/docs' },
              { label: 'API', href: '/docs/api' },
              { label: 'Providers', href: '/docs/providers' },
              { label: 'Architecture', href: '/docs/architecture' },
            ].map(l => (
              <Link key={l.href} href={l.href} style={{ fontSize: 13, color: T.muted, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onSearchOpen} aria-label="Search documentation" style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: T.elevated,
            border: `1px solid ${T.border}`, borderRadius: 6, color: T.dim, fontSize: 13, cursor: 'pointer', fontFamily: T.font,
          }}>
            <span>Search...</span>
            <span style={{ fontSize: 11, fontFamily: T.mono, padding: '1px 5px', background: T.bg, border: `1px solid ${T.border}`, borderRadius: 3 }}>⌘K</span>
          </button>
          <a href="https://github.com/twistedoliver211fs-art/bifrost" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = T.muted)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
          </a>
          <Link href="/dashboard" style={{ fontSize: 12, color: T.muted, textDecoration: 'none', padding: '5px 12px', border: `1px solid ${T.border}`, borderRadius: 4, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.borderColor = T.dim; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.muted; e.currentTarget.style.borderColor = T.border; }}>
            Dashboard
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
function Sidebar({ pathname, mobileOpen, onClose }: { pathname: string; mobileOpen: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    sidebarData.forEach(g => { init[g.title] = true; });
    return init;
  });

  const toggle = (title: string) => setExpanded(p => ({ ...p, [title]: !p[title] }));

  const sidebar = (
    <nav aria-label="Documentation navigation" style={{ width: 260, flexShrink: 0, padding: '8px 0', overflowY: 'auto', height: '100%' }}>
      {sidebarData.map(group => (
        <div key={group.title} style={{ marginBottom: 4 }}>
          <button onClick={() => toggle(group.title)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
            padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 600, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase',
            letterSpacing: '0.08em', textAlign: 'left',
          }}>
            {group.title}
            <span style={{ fontSize: 10, color: T.dim, transition: 'transform 0.15s', transform: expanded[group.title] ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
          </button>
          {expanded[group.title] && (
            <div>
              {group.items.map(item => {
                const active = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={onClose} style={{
                    display: 'block', padding: '6px 20px 6px 28px', fontSize: 13, textDecoration: 'none',
                    color: active ? T.accent : T.muted, background: active ? `${T.accent}08` : 'transparent',
                    borderLeft: active ? `2px solid ${T.accent}` : '2px solid transparent',
                    transition: 'all 0.1s',
                  }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = T.text; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = T.muted; }}>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Desktop */}
      <div className="docs-sidebar-desktop" style={{ position: 'fixed', top: 56, left: 0, bottom: 0, width: 260, borderRight: `1px solid ${T.borderSubtle}`, overflow: 'hidden', display: 'none' }}>
        {sidebar}
      </div>
      {/* Mobile */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150, display: 'none' }} className="docs-sidebar-mobile">
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, background: T.bg, borderRight: `1px solid ${T.border}`, overflow: 'auto' }}>
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.borderSubtle}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Navigation</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.dim, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </>
  );
}

// ── On this page (right sidebar) ────────────────────────────────────────────
function TableOfContents() {
  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    const els = document.querySelectorAll('h2[id], h3[id]');
    const items = Array.from(els).map(el => ({ id: el.id, text: el.textContent || '', level: el.tagName === 'H2' ? 2 : 3 }));
    setHeadings(items);

    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) setActiveId(e.target.id); });
    }, { rootMargin: '-80px 0px -80% 0px' });
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  if (headings.length === 0) return null;
  return (
    <nav aria-label="On this page" style={{ width: 200, flexShrink: 0, padding: '8px 0', display: 'none' }} className="docs-toc-desktop">
      <div style={{ fontSize: 10, fontWeight: 600, color: T.dim, fontFamily: T.mono, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, paddingLeft: 16 }}>On this page</div>
      {headings.map(h => (
        <a key={h.id} href={`#${h.id}`} style={{
          display: 'block', padding: `4px 16px 4px ${h.level === 3 ? 28 : 16}px`,
          fontSize: 12, textDecoration: 'none', color: activeId === h.id ? T.accent : T.dim,
          borderLeft: activeId === h.id ? `2px solid ${T.accent}` : '2px solid transparent',
          transition: 'all 0.1s',
        }}
          onMouseEnter={e => { if (activeId !== h.id) e.currentTarget.style.color = T.muted; }}
          onMouseLeave={e => { if (activeId !== h.id) e.currentTarget.style.color = T.dim; }}>
          {h.text}
        </a>
      ))}
    </nav>
  );
}

// ── Breadcrumbs ─────────────────────────────────────────────────────────────
function Breadcrumbs({ pathname }: { pathname: string }) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => ({
    label: p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '),
    href: '/' + parts.slice(0, i + 1).join('/'),
  }));
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Link href="/docs" style={{ color: T.dim, textDecoration: 'none', transition: 'color 0.15s' }}
        onMouseEnter={e => (e.currentTarget.style.color = T.text)}
        onMouseLeave={e => (e.currentTarget.style.color = T.dim)}>Docs</Link>
      {crumbs.slice(1).map((c, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: T.dim }}>/</span>
          <Link href={c.href} style={{ color: i === crumbs.length - 2 ? T.text : T.dim, textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.color = T.text)}
            onMouseLeave={e => (e.currentTarget.style.color = i === crumbs.length - 2 ? T.text : T.dim)}>
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

// ── Prev/Next ───────────────────────────────────────────────────────────────
function PrevNext({ pathname }: { pathname: string }) {
  const flat = sidebarData.flatMap(g => g.items);
  const idx = flat.findIndex(i => i.href === pathname);
  const prev = idx > 0 ? flat[idx - 1] : null;
  const next = idx < flat.length - 1 ? flat[idx + 1] : null;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 48, paddingTop: 24, borderTop: `1px solid ${T.borderSubtle}` }}>
      {prev ? (
        <Link href={prev.href} style={{ textDecoration: 'none', padding: '12px 16px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, transition: 'border-color 0.15s', maxWidth: '45%' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = T.dim)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>← Previous</div>
          <div style={{ fontSize: 13, color: T.text }}>{prev.label}</div>
        </Link>
      ) : <div />}
      {next ? (
        <Link href={next.href} style={{ textDecoration: 'none', padding: '12px 16px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, transition: 'border-color 0.15s', maxWidth: '45%', textAlign: 'right' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = T.dim)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = T.border)}>
          <div style={{ fontSize: 11, color: T.dim, marginBottom: 4 }}>Next →</div>
          <div style={{ fontSize: 13, color: T.text }}>{next.label}</div>
        </Link>
      ) : <div />}
    </div>
  );
}

// ── Layout ──────────────────────────────────────────────────────────────────
export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => { setMobileNav(false); }, [pathname]);

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: T.font, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: ${T.bg}; color: ${T.text}; }
        .docs-sidebar-desktop { display: block !important; }
        .docs-toc-desktop { display: block !important; }
        @media (max-width: 1100px) { .docs-toc-desktop { display: none !important; } }
        @media (max-width: 860px) { .docs-sidebar-desktop { display: none !important; } .docs-nav-links { display: none !important; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition-duration: 0.01ms !important; } }
        pre { overflow-x: auto; }
        code { font-family: ${T.mono}; }
      `}</style>
      <DocsHeader onSearchOpen={() => setSearchOpen(true)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <Sidebar pathname={pathname} mobileOpen={mobileNav} onClose={() => setMobileNav(false)} />

      {/* Mobile nav toggle */}
      <button onClick={() => setMobileNav(true)} aria-label="Open navigation" className="docs-mobile-nav-btn" style={{
        display: 'none', position: 'fixed', top: 64, left: 12, zIndex: 90,
        padding: '6px 10px', background: T.card, border: `1px solid ${T.border}`, borderRadius: 4,
        color: T.muted, fontSize: 12, cursor: 'pointer',
      }}>☰ Menu</button>
      <style>{`@media (max-width: 860px) { .docs-mobile-nav-btn { display: block !important; } }`}</style>

      <div style={{ marginLeft: 260, marginTop: 56, minHeight: 'calc(100vh - 56px)', display: 'flex' }} className="docs-main-wrapper">
        <style>{`@media (max-width: 860px) { .docs-main-wrapper { margin-left: 0 !important; } }`}</style>
        <main style={{ flex: 1, minWidth: 0, maxWidth: 800, padding: '32px 40px 80px' }} className="docs-content">
          <style>{`@media (max-width: 860px) { .docs-content { padding: 24px 16px 60px !important; } }`}</style>
          <Breadcrumbs pathname={pathname} />
          {children}
          <PrevNext pathname={pathname} />
        </main>
        <TableOfContents />
      </div>
    </div>
  );
}
