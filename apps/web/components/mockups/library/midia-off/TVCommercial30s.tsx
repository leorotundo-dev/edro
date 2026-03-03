'use client';

import React from 'react';

interface TVCommercial30sProps {
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

export const TVCommercial30s: React.FC<TVCommercial30sProps> = ({
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
  brandColor = '#2563EB',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Uma história em 30 segundos.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Apresentação do problema, solução com o produto e chamada para ação clara ao final.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#2563EB';

  const frames = [
    { n: '01', label: 'Situação', sublabel: '0–8s', bg: '#1a1a2e' },
    { n: '02', label: 'Conflito', sublabel: '8–18s', bg: '#2e1a1a' },
    { n: '03', label: 'Solução', sublabel: '18–26s', bg: '#1a2e1a' },
    { n: '04', label: 'CTA', sublabel: '26–30s', bg: '#1a2a2e' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes tv30-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .tv30-dot { animation: tv30-pulse 1.5s ease-in-out infinite; }
        @keyframes tv30-progress { from{width:0%} to{width:100%} }
        .tv30-prog { animation: tv30-progress 3s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>TV</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Padrão</div>
          <div style={{ color: '#666', fontSize: 10 }}>Formato 3 atos</div>
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="tv30-dot" style={{ width: 6, height: 6, background: accent, borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Story arc indicator */}
      <div style={{ background: '#141414', padding: '10px 16px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
          {['Apresentação', 'Desenvolvimento', 'Clímax', 'Resolução'].map((arc, i) => (
            <React.Fragment key={i}>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: i <= 2 ? accent : '#333', margin: '0 auto 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{i + 1}</span>
                </div>
                <span style={{ color: '#666', fontSize: 8 }}>{arc}</span>
              </div>
              {i < 3 && <div style={{ width: 20, height: 1, background: i < 2 ? accent : '#333', marginBottom: 14 }} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Storyboard frames */}
      <div style={{ padding: '0 16px 0', background: '#141414' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {frames.map((frame, i) => (
            <div key={i} style={{ flex: 1, background: '#222', borderRadius: 6, overflow: 'hidden', border: '1px solid #333' }}>
              {i === 1 && img
                ? <img src={img} alt="frame" style={{ width: '100%', height: 56, objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 56, background: frame.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
              }
              <div style={{ padding: '3px 5px', background: '#1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: accent, fontSize: 8, fontWeight: 700 }}>#{frame.n}</span>
                  <span style={{ color: '#666', fontSize: 8 }}>{frame.sublabel}</span>
                </div>
                <span style={{ color: '#aaa', fontSize: 9 }}>{frame.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline bar */}
        <div style={{ position: 'relative', height: 4, background: '#2a2a2a', borderRadius: 2, marginBottom: 12 }}>
          <div className="tv30-prog" style={{ position: 'absolute', left: 0, top: 0, height: '100%', background: `linear-gradient(90deg, ${accent}, #60a5fa)`, borderRadius: 2 }} />
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span style={{ color: '#888', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>ROTEIRO</span>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Adultos 18–55' },
            { icon: '🎭', label: 'Tom', value: 'Narrativo / Emocional' },
            { icon: '📢', label: 'CTA', value: 'Conversão + Recall' },
            { icon: '🎬', label: 'Formato', value: '30s • Padrão nacional' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px' }}>
              <span style={{ fontSize: 14 }}>{d.icon}</span>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 11, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação prevista</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: 'globo', color: '#f97316' },
            { label: 'SBT', color: '#3b82f6' },
            { label: 'REC', color: '#ef4444' },
            { label: 'BAND', color: '#a855f7' },
          ].map((ch, i) => (
            <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
