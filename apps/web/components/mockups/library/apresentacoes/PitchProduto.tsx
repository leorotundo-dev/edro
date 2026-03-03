'use client';

import React from 'react';

interface PitchProdutoProps {
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

export const PitchProduto: React.FC<PitchProdutoProps> = ({
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
  const slideTitle = headline ?? title ?? 'Como Funciona';
  const companyName = brandName ?? name ?? 'Startup';
  const subText = body ?? caption ?? description ?? text ?? 'Três passos simples para transformar seu negócio';
  const productImg = image ?? postImage ?? thumbnail ?? '';

  const steps = [
    {
      num: '01',
      label: 'Conecte',
      desc: 'Integre suas ferramentas em minutos via API ou plugins nativos',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ),
    },
    {
      num: '02',
      label: 'Configure',
      desc: 'Defina regras de negócio e fluxos automatizados sem código',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M12 2v2M12 20v2M4.93 4.93l1.41 1.41M18.66 18.66l1.41 1.41M2 12h2M20 12h2" />
        </svg>
      ),
    },
    {
      num: '03',
      label: 'Escale',
      desc: 'Acompanhe resultados em tempo real e expanda com um clique',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      ),
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
        @keyframes pitch-prod-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${accent}, ${accent}44, transparent)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: `linear-gradient(180deg, ${accent}, transparent)` }} />

      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', padding: '20px 26px 16px 30px' }}>

        {/* Header */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' }}>
            {companyName}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            {slideTitle}
          </h2>
          <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>{subText}</p>
        </div>

        {/* Steps flow */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: '0', flex: 1, animation: 'pitch-prod-in 0.5s ease-out' }}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              <div style={{
                flex: 1, background: '#ffffff', borderRadius: '10px',
                border: `1.5px solid ${i === 1 ? accent : '#e2e8f0'}`,
                padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                boxShadow: i === 1 ? `0 4px 16px ${accent}22` : '0 1px 4px rgba(0,0,0,0.05)',
                position: 'relative',
              }}>
                {i === 1 && (
                  <div style={{
                    position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)',
                    background: accent, color: '#fff', fontSize: '8px', fontWeight: 700,
                    borderRadius: '0 0 6px 6px', padding: '2px 8px', letterSpacing: '0.08em',
                  }}>
                    DESTAQUE
                  </div>
                )}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: i === 1 ? accent : `${accent}18`,
                  color: i === 1 ? '#fff' : accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '10px',
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 900, color: i === 1 ? accent : '#cbd5e1', lineHeight: 1, marginBottom: '6px' }}>
                  {step.num}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '5px' }}>
                  {step.label}
                </div>
                <p style={{ fontSize: '10px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                  {step.desc}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Screenshot strip or placeholder */}
        {productImg ? (
          <div style={{ marginTop: '12px', height: '40px', borderRadius: '6px', overflow: 'hidden' }}>
            <img src={productImg} alt="Screenshot do produto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : (
          <div style={{
            marginTop: '12px', height: '24px', borderRadius: '6px',
            background: `linear-gradient(90deg, ${accent}22, ${accent}11, ${accent}22)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px',
          }}>
            {['API REST', 'Webhooks', 'SDK Mobile', 'SSO / OAuth'].map((t, i) => (
              <span key={i} style={{ fontSize: '9px', fontWeight: 600, color: accent }}>{t}</span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
          <span>Confidencial</span>
          <span>05 / 15</span>
        </div>
      </div>
    </div>
  );
};
