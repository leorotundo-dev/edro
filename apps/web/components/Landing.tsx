'use client';

import Link from 'next/link';

const FEATURES = [
  { icon: '✦', label: 'Briefing com IA' },
  { icon: '✦', label: 'Copy generativa' },
  { icon: '✦', label: 'Arte IA' },
  { icon: '✦', label: 'Calendário editorial' },
  { icon: '✦', label: 'Social Listening' },
  { icon: '✦', label: 'Analytics' },
  { icon: '✦', label: 'Aprovação de clientes' },
  { icon: '✦', label: 'Gestão de entregas' },
];

const CARDS = [
  {
    tag: 'Copy IA',
    color: '#ff6600',
    text: '"Lançamento exclusivo para quem acredita que moda é expressão, não tendência."',
    sub: '4 variações · Tom editorial',
  },
  {
    tag: 'Calendário',
    color: '#0ea5e9',
    text: 'Dia dos Namorados — 3 pautas sugeridas com base no histórico da marca.',
    sub: '12 jun · Alta relevância',
  },
  {
    tag: 'Social Listening',
    color: '#13deb9',
    text: 'Menções em alta: +42% em "conforto urbano" nos últimos 7 dias.',
    sub: 'Instagram · Facebook · Web',
  },
];

export default function Landing() {
  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 6vw', borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(12px)',
      }}>
        <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, letterSpacing: '-0.01em' }}>
          edro<span style={{ color: '#ff6600' }}>.</span>
        </span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link href="/login" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 500,
            border: '1px solid rgba(255,255,255,0.15)', color: '#cbd5e1',
            transition: 'border-color 0.2s',
          }}>
            Entrar
          </Link>
          <Link href="/login" style={{
            padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            background: '#ff6600', color: '#fff',
          }}>
            Solicitar acesso
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '100px 6vw 80px', maxWidth: 1280, margin: '0 auto', position: 'relative' }}>

        {/* Glow */}
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 700, height: 500, borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Tag line */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,102,0,0.1)', border: '1px solid rgba(255,102,0,0.25)',
          borderRadius: 100, padding: '6px 14px', marginBottom: 40,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff6600', display: 'inline-block' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: '#ff8533', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Plataforma de IA para agências
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: "'Instrument Serif', serif",
          fontSize: 'clamp(40px, 6vw, 84px)',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.02em',
          marginBottom: 28,
          maxWidth: 800,
        }}>
          A inteligência que<br />
          <em style={{ color: '#ff6600', fontStyle: 'italic' }}>move</em> sua agência.
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 'clamp(16px, 1.4vw, 20px)',
          color: '#94a3b8',
          lineHeight: 1.65,
          maxWidth: 560,
          marginBottom: 48,
        }}>
          De briefings a publicação — copy, arte IA, calendário editorial e métricas em um único sistema pensado para agências de marketing.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 80 }}>
          <Link href="/login" style={{
            padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 700,
            background: '#ff6600', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 0 32px rgba(255,102,0,0.35)',
          }}>
            Começar agora
            <span style={{ fontSize: 18 }}>→</span>
          </Link>
          <a href="mailto:oi@edro.digital" style={{
            padding: '14px 32px', borderRadius: 10, fontSize: 15, fontWeight: 600,
            border: '1px solid rgba(255,255,255,0.12)', color: '#e2e8f0',
            display: 'inline-flex', alignItems: 'center', gap: 8,
          }}>
            Falar com a equipe
          </a>
        </div>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 80 }}>
          {FEATURES.map((f) => (
            <span key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 100, fontSize: 13,
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#94a3b8', background: 'rgba(255,255,255,0.03)',
            }}>
              <span style={{ color: '#ff6600', fontSize: 9 }}>{f.icon}</span>
              {f.label}
            </span>
          ))}
        </div>

        {/* Preview cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {CARDS.map((card) => (
            <div key={card.tag} style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '24px',
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${card.color}18`, border: `1px solid ${card.color}40`,
                borderRadius: 100, padding: '3px 10px',
                fontSize: 11, fontWeight: 700, color: card.color,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                marginBottom: 16,
              }}>
                {card.tag}
              </div>
              <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 12 }}>
                {card.text}
              </p>
              <p style={{ fontSize: 12, color: '#475569' }}>{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer line */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '32px 6vw',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
      }}>
        <span style={{ fontSize: 13, color: '#334155' }}>© 2026 Edro.Digital</span>
        <a href="mailto:oi@edro.digital" style={{ fontSize: 13, color: '#475569' }}>oi@edro.digital</a>
      </footer>
    </div>
  );
}
