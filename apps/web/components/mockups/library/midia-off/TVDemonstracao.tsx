'use client';

import React from 'react';

interface TVDemonstracaoProps {
  name?: string;
  username?: string;
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
  profileImage?: string;
  brandColor?: string;
}

export const TVDemonstracao: React.FC<TVDemonstracaoProps> = ({
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
  brandColor = '#0EA5E9',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Veja como funciona na prática.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Demonstração passo a passo mostrando o produto em uso real, com resultados visíveis e comprovados.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#0EA5E9';

  const steps = [
    { n: 1, label: 'Prepare', time: '0–7s', desc: 'Apresentação do produto' },
    { n: 2, label: 'Aplique', time: '7–18s', desc: 'Uso na prática' },
    { n: 3, label: 'Resultado', time: '18–27s', desc: 'Benefício visível' },
    { n: 4, label: 'Conclua', time: '27–30s', desc: 'CTA / Marca' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes demo-step { 0%,100%{opacity:0.5;transform:scale(0.97)} 50%{opacity:1;transform:scale(1)} }
        .demo-active { animation: demo-step 2s ease-in-out infinite; }
        @keyframes demo-arrow { 0%,100%{transform:translateX(0)} 50%{transform:translateX(3px)} }
        .demo-arrow { animation: demo-arrow 1s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>DEMO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Demonstração</div>
          <div style={{ color: '#666', fontSize: 10 }}>Passo a passo • Produto em uso</div>
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Step-by-step frames */}
      <div style={{ background: '#141414', padding: '12px 16px 10px' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>STORYBOARD — 4 PASSOS</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
          {steps.map((s, i) => (
            <React.Fragment key={i}>
              <div className={i === 1 ? 'demo-active' : ''} style={{ flex: 1, background: '#1e1e1e', border: `1px solid ${i === 1 ? accent : '#333'}`, borderRadius: 8, overflow: 'hidden' }}>
                {i === 1 && img
                  ? <img src={img} alt={s.label} style={{ width: '100%', height: 60, objectFit: 'cover', display: 'block' }} />
                  : <div style={{ height: 60, background: i === 0 ? '#1a1a2e' : i === 2 ? '#0a1a2e' : i === 3 ? `${accent}15` : '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: i <= 1 ? accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>{s.n}</span>
                      </div>
                    </div>
                }
                <div style={{ padding: '4px 6px', background: '#111' }}>
                  <span style={{ color: i === 1 ? accent : '#aaa', fontSize: 9, fontWeight: 700, display: 'block' }}>{s.label}</span>
                  <span style={{ color: '#555', fontSize: 8, display: 'block' }}>{s.time}</span>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="demo-arrow" style={{ display: 'flex', alignItems: 'center', paddingBottom: 22 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step descriptions */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#1e1e1e', borderRadius: 6, padding: '6px 10px', border: `1px solid ${i === 1 ? accent + '40' : '#2a2a2a'}` }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= 1 ? accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{s.n}</span>
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ color: i === 1 ? accent : '#ccc', fontSize: 11, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: '#666', fontSize: 10, marginLeft: 8 }}>{s.desc}</span>
              </div>
              <span style={{ color: '#555', fontSize: 9 }}>{s.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Compradores ativos' },
            { icon: '🎭', label: 'Tom', value: 'Didático / Confiante' },
            { icon: '📢', label: 'CTA', value: 'Experimente agora' },
            { icon: '🎬', label: 'Formato', value: '30s • Demo step-by-step' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
