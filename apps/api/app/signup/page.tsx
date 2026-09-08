'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const t = {
  bg: '#09090b', card: '#0f0f12', border: '#27272a', borderSubtle: '#1c1c1f',
  text: '#fafafa', muted: '#a1a1aa', dim: '#52525b', accent: '#22c55e',
  font: "'Inter', -apple-system, sans-serif", mono: "'JetBrains Mono', monospace",
};

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (typeof window !== 'undefined') localStorage.setItem('bifrost_auth', JSON.stringify({ email, name, loggedIn: true, ts: Date.now() }));
    router.push('/dashboard');
    setLoading(false);
  };

  return (
    <div style={{ background: t.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: t.font, WebkitFontSmoothing: 'antialiased' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; } body { background: ${t.bg}; }`}</style>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(${t.borderSubtle} 1px, transparent 1px), linear-gradient(90deg, ${t.borderSubtle} 1px, transparent 1px)`, backgroundSize: '60px 60px', opacity: 0.15 }} />

      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px', position: 'relative', opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.4s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <a href="/" style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: '-0.02em', textDecoration: 'none', fontFamily: t.mono }}>BIFROST</a>
          <div style={{ fontSize: 14, color: t.muted, marginTop: 8 }}>Create your account</div>
        </div>

        <div style={{ background: t.card, border: `1px solid ${t.border}`, borderRadius: 10, padding: 28 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name"
                style={{ width: '100%', padding: '10px 12px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, fontFamily: t.font, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = t.accent)} onBlur={e => (e.currentTarget.style.borderColor = t.border)} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"
                style={{ width: '100%', padding: '10px 12px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, fontFamily: t.font, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = t.accent)} onBlur={e => (e.currentTarget.style.borderColor = t.border)} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, color: t.dim, fontFamily: t.mono, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="Min 6 characters"
                style={{ width: '100%', padding: '10px 12px', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 6, color: t.text, fontSize: 13, fontFamily: t.font, outline: 'none', transition: 'border-color 0.15s' }}
                onFocus={e => (e.currentTarget.style.borderColor = t.accent)} onBlur={e => (e.currentTarget.style.borderColor = t.border)} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px 0', background: loading ? '#1a1a1a' : t.accent, color: loading ? t.dim : '#000',
              fontSize: 13, fontWeight: 600, fontFamily: t.mono, border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer',
            }} onMouseEnter={e => !loading && (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => !loading && (e.currentTarget.style.opacity = '1')}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: t.dim }}>
          Already have an account? <a href="/login" style={{ color: t.accent, textDecoration: 'none' }}>Sign in</a>
        </div>
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <a href="/" style={{ fontSize: 12, color: t.dim, textDecoration: 'none' }}>&larr; Back to home</a>
        </div>
      </div>
    </div>
  );
}
