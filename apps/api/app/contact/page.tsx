'use client';
import { useState } from 'react';
import Link from 'next/link';

const COLORS = {
  bg: '#09090b',
  card: '#0f0f12',
  border: '#27272a',
  text: '#fafafa',
  muted: '#a1a1aa',
  dim: '#52525b',
  green: '#22c55e',
  cyan: '#06b6d4',
  purple: '#a855f7',
  pink: '#ec4899',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
};

const GRADIENT_BG = `linear-gradient(135deg, #09090b 0%, #0c1222 25%, #0f0a1a 50%, #0a0f0c 75%, #09090b 100%)`;
const GRADIENT_CARD = `linear-gradient(145deg, rgba(34,197,94,0.08) 0%, rgba(6,182,212,0.06) 50%, rgba(168,85,247,0.04) 100%)`;
const RING_GRADIENT = `conic-gradient(from 0deg, #22c55e, #06b6d4, #a855f7, #ec4899, #f59e0b, #22c55e)`;

export default function ContactPage() {
  const [step, setStep] = useState<'intro' | 'form' | 'redirect'>('intro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitted(true);
    setStep('redirect');
    setTimeout(() => {
      window.open('https://calendly.com/twistedoliver211fs/discussion', '_blank');
    }, 1800);
  };

  return (
    <div style={{ minHeight: '100vh', background: GRADIENT_BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', fontFamily: "'Inter', -apple-system, sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)', top: '-10%', left: '-5%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)', bottom: '-5%', right: '-5%', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', top: '40%', right: '20%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      {/* Back link */}
      <Link href="/" style={{ position: 'absolute', top: 24, left: 24, fontSize: 13, color: COLORS.dim, textDecoration: 'none', transition: 'color 0.15s', zIndex: 10 }}
        onMouseEnter={e => (e.currentTarget.style.color = COLORS.green)}
        onMouseLeave={e => (e.currentTarget.style.color = COLORS.dim)}>
        ← Back to Bifrost
      </Link>

      {/* Main card */}
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520 }}>
        {step === 'intro' && (
          <div style={{ background: GRADIENT_CARD, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '48px 40px', textAlign: 'center', backdropFilter: 'blur(20px)' }}>
            {/* Animated ring */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: RING_GRADIENT, padding: 3, margin: '0 auto 28px', animation: 'spin 4s linear infinite' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 32 }}>💬</span>
              </div>
            </div>

            <h1 style={{ fontSize: 28, fontWeight: 800, color: COLORS.text, marginBottom: 12, letterSpacing: '-0.02em' }}>
              Talk to the team
            </h1>
            <p style={{ fontSize: 15, color: COLORS.muted, lineHeight: 1.7, marginBottom: 8 }}>
              Have questions about Bifrost? Want a custom integration?<br />
              Or just want to say hi from <span style={{ color: COLORS.cyan }}>Kericho, Kenya</span> 🇰🇪?
            </p>
            <p style={{ fontSize: 13, color: COLORS.dim, marginBottom: 32 }}>
              Book a 15-minute chat with Oliver — we&apos;ll walk you through anything you need.
            </p>

            {/* Feature badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 36 }}>
              {[
                { icon: '⚡', label: 'Live Demo', color: COLORS.amber },
                { icon: '🔧', label: 'Integration Help', color: COLORS.cyan },
                { icon: '📊', label: 'Pricing Talk', color: COLORS.green },
                { icon: '🤝', label: 'Partnership', color: COLORS.purple },
              ].map(b => (
                <span key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.03)', fontSize: 12, color: COLORS.muted }}>
                  <span style={{ color: b.color }}>{b.icon}</span> {b.label}
                </span>
              ))}
            </div>

            <button onClick={() => setStep('form')}
              style={{ width: '100%', padding: '14px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.cyan})`, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: `0 0 20px rgba(34,197,94,0.25)` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 30px rgba(34,197,94,0.4)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 20px rgba(34,197,94,0.25)`; }}>
              Let&apos;s schedule a meeting →
            </button>

            <p style={{ fontSize: 11, color: COLORS.dim, marginTop: 16 }}>
              No spam. No sales calls. Just a genuine conversation.
            </p>
          </div>
        )}

        {step === 'form' && (
          <div style={{ background: GRADIENT_CARD, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '48px 40px', backdropFilter: 'blur(20px)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <button onClick={() => setStep('intro')} style={{ background: 'none', border: 'none', color: COLORS.dim, fontSize: 18, cursor: 'pointer', padding: 4 }}>←</button>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: COLORS.text }}>Almost there!</h2>
            </div>
            <p style={{ fontSize: 13, color: COLORS.muted, marginBottom: 28 }}>
              Drop your details and we&apos;ll open Calendly to pick a time that works for you.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Your Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. James Mwangi" required
                  style={{ width: '100%', padding: '12px 14px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = COLORS.green)}
                  onBlur={e => (e.currentTarget.style.borderColor = COLORS.border)} />
              </div>
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: COLORS.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required
                  style={{ width: '100%', padding: '12px 14px', background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.text, fontSize: 14, outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => (e.currentTarget.style.borderColor = COLORS.cyan)}
                  onBlur={e => (e.currentTarget.style.borderColor = COLORS.border)} />
              </div>

              <button type="submit"
                style={{ width: '100%', padding: '14px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.cyan})`, color: '#000', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s', boxShadow: `0 0 20px rgba(34,197,94,0.25)` }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = `0 0 30px rgba(34,197,94,0.4)`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 20px rgba(34,197,94,0.25)`; }}>
                Open Calendly →
              </button>
            </form>

            <div style={{ marginTop: 20, padding: 12, background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.15)' }}>
              <p style={{ fontSize: 11, color: COLORS.green, textAlign: 'center' }}>
                🔒 Your info is safe. We only use it to schedule your meeting.
              </p>
            </div>
          </div>
        )}

        {step === 'redirect' && (
          <div style={{ background: GRADIENT_CARD, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: '64px 40px', textAlign: 'center', backdropFilter: 'blur(20px)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.green}, ${COLORS.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: `0 0 40px rgba(34,197,94,0.3)` }}>
              <span style={{ fontSize: 28, color: '#000' }}>✓</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: COLORS.text, marginBottom: 12 }}>
              Thanks, {name.split(' ')[0]}!
            </h2>
            <p style={{ fontSize: 14, color: COLORS.muted, marginBottom: 8 }}>
              Opening Calendly in a moment…
            </p>
            <p style={{ fontSize: 13, color: COLORS.dim, marginBottom: 28 }}>
              Pick a time that works for you. See you there! 🤝
            </p>
            <a href="https://calendly.com/twistedoliver211fs/discussion" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 8, border: `1px solid ${COLORS.border}`, background: 'rgba(255,255,255,0.05)', color: COLORS.text, fontSize: 13, textDecoration: 'none', transition: 'border-color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = COLORS.green)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = COLORS.border)}>
              Open Calendly manually →
            </a>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
