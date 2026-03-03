'use client';

import React from 'react';

interface PitchSolucaoProps {
  name?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  brandColor?: string;
  themeColor?: string;
}

export const PitchSolucao: React.FC<PitchSolucaoProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor,
  themeColor,
}) => {
  const accent = themeColor ?? brandColor ?? '#0EA5E9';
  const slideTitle = headline ?? title ?? 'Nossa Solução';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Uma plataforma inteligente que resolve os 3 maiores problemas do mercado';
  const productImg = image ?? postImage ?? thumbnail ?? '';

  const benefits = [
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      label: 'Automação Inteligente',
      desc: 'Reduz 80% do trabalho manual com IA',
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
      ),
      label: 'Dashboard em Tempo Real',
      desc: 'Visibilidade total do negócio 24/7',
    },
    {
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      label: 'Colaboração em Equipe',
      desc: 'Times alinhados em uma única plataforma',
    },
  ];

  return (
    <div style={{
      position: 'relative', width: '560px', height: '315px',
      borderRadius: '10px', overflow: 'hidden',
      background: '#f8fafc',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <style>{`
        @keyframes pitch-sol-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: `linear-gradient(90deg, ${accent}, ${accent}55, transparent)`,
      }} />

      {/* Background shape */}
      <div style={{
        position: 'absolute', top: 0, right: 0, width: '260px', height: '315px',
        background: `linear-gradient(135deg, ${accent}0a 0%, ${accent}18 100%)`,
      }} />

      <div style={{
        position: 'relative', height: '100%',
        display: 'flex', gap: '20px',
        padding: '22px 24px 18px 26px',
      }}>

        {/* Left column */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: '14px' }}>
            <div style={{
              fontSize: '10px', fontWeight: 700, color: accent,
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px',
            }}>
              {companyName}
            </div>
            <h2 style={{
              fontSize: '22px', fontWeight: 900, color: '#0f172a',
              margin: '0 0 6px 0', letterSpacing: '-0.02em',
            }}>
              {slideTitle}
            </h2>
            <p style={{ fontSize: '10px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
              {subText}
            </p>
          </div>

          {/* Benefits */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, animation: 'pitch-sol-slide 0.5s ease-out' }}>
            {benefits.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                background: '#ffffff', borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '8px 10px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  minWidth: '28px', height: '28px', borderRadius: '7px',
                  background: `${accent}18`, color: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', marginBottom: '1px' }}>{b.label}</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{b.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '8px', fontSize: '10px', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
            <span>Confidencial</span>
            <span>03 / 15</span>
          </div>
        </div>

        {/* Right column — product screenshot */}
        <div style={{
          flex: 1, borderRadius: '10px', overflow: 'hidden',
          background: `linear-gradient(135deg, #1e293b 0%, #0f172a 100%)`,
          border: `1.5px solid ${accent}44`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          boxShadow: `0 8px 24px ${accent}22`,
        }}>
          {productImg ? (
            <img src={productImg} alt="Produto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
          ) : (
            <>
              {/* Fake UI mockup */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', gap: '5px', padding: '0 10px' }}>
                {['#ef4444', '#f59e0b', '#22c55e'].map((c, i) => (
                  <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: c }} />
                ))}
                <div style={{ flex: 1, marginLeft: '8px', height: '10px', background: '#334155', borderRadius: '4px', maxWidth: '100px' }} />
              </div>
              <div style={{ padding: '34px 12px 12px 12px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[`${accent}`, '#22c55e', '#f59e0b'].map((c, i) => (
                    <div key={i} style={{ flex: 1, height: '40px', borderRadius: '6px', background: `${c}22`, border: `1px solid ${c}44` }} />
                  ))}
                </div>
                <div style={{ height: '60px', borderRadius: '6px', background: '#334155', display: 'flex', alignItems: 'flex-end', padding: '8px', gap: '4px' }}>
                  {[60, 80, 45, 90, 70, 85, 55].map((h, i) => (
                    <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0', background: `${accent}${i === 3 ? 'ff' : '66'}` }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{ flex: 2, height: '28px', borderRadius: '6px', background: '#334155' }} />
                  <div style={{ flex: 1, height: '28px', borderRadius: '6px', background: `${accent}44` }} />
                </div>
              </div>
              <div style={{
                position: 'absolute', bottom: '10px', left: '50%',
                transform: 'translateX(-50%)',
                background: accent, color: '#fff',
                fontSize: '9px', fontWeight: 700, borderRadius: '4px',
                padding: '3px 8px', whiteSpace: 'nowrap',
              }}>
                Plataforma ao vivo
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
