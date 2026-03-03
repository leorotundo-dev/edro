'use client';

import React from 'react';

interface TVCommercial60sProps {
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

export const TVCommercial60s: React.FC<TVCommercial60sProps> = ({
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
  brandColor = '#7C3AED',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Uma narrativa completa em 60 segundos.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Formato longo que permite desenvolver personagens, construir emoção e criar conexão profunda com o público.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#7C3AED';

  const scenes = [
    { n: '01', label: 'Prólogo', time: '0–10s', bg: '#1a1a2e' },
    { n: '02', label: 'Apresentação', time: '10–25s', bg: '#2e1a2e' },
    { n: '03', label: 'Clímax', time: '25–45s', bg: '#2e2a1a' },
    { n: '04', label: 'Resolução', time: '45–55s', bg: '#1a2e1a' },
    { n: '05', label: 'Assinatura', time: '55–60s', bg: '#1a2a2e' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes tv60-glow { 0%,100%{box-shadow:0 0 6px ${accent}60} 50%{box-shadow:0 0 16px ${accent}aa} }
        .tv60-glow { animation: tv60-glow 2s ease-in-out infinite; }
        @keyframes tv60-scan { 0%{transform:translateX(-100%)} 100%{transform:translateX(2200%)} }
        .tv60-scan { animation: tv60-scan 3s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>TV</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Formato Longo</div>
          <div style={{ color: '#666', fontSize: 10 }}>Narrativa completa • 5 cenas</div>
        </div>
        <div className="tv60-glow" style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 12px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>60s</span>
        </div>
      </div>

      {/* Narrative arc SVG */}
      <div style={{ background: '#141414', padding: '10px 16px 6px' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ARCO NARRATIVO</div>
        <div style={{ position: 'relative', height: 38, overflow: 'hidden' }}>
          <svg width="388" height="38" viewBox="0 0 388 38">
            <path d="M0 30 C60 30, 110 10, 160 8 C210 6, 260 6, 300 14 C330 20, 360 26, 388 30" stroke={`${accent}40`} strokeWidth="1.5" fill="none" strokeDasharray="4 2"/>
            <path d="M0 30 C60 30, 110 10, 160 8 C210 6, 235 6, 255 10" stroke={accent} strokeWidth="2" fill="none"/>
            <circle cx="255" cy="10" r="4" fill={accent}/>
            <circle cx="0" cy="30" r="3" fill={`${accent}80`}/>
          </svg>
          <div className="tv60-scan" style={{ position: 'absolute', top: 0, left: 0, width: 16, height: '100%', background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }} />
        </div>
      </div>

      {/* Storyboard — 5 small frames */}
      <div style={{ padding: '0 16px 10px', background: '#141414' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {scenes.map((s, i) => (
            <div key={i} style={{ flex: 1, background: '#222', borderRadius: 5, overflow: 'hidden', border: '1px solid #333' }}>
              {i === 2 && img
                ? <img src={img} alt="cena" style={{ width: '100%', height: 50, objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 50, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
              }
              <div style={{ padding: '3px 4px', background: '#1a1a1a' }}>
                <span style={{ color: accent, fontSize: 7, fontWeight: 700, display: 'block' }}>#{s.n}</span>
                <span style={{ color: '#aaa', fontSize: 8, display: 'block' }}>{s.label}</span>
                <span style={{ color: '#555', fontSize: 7, display: 'block' }}>{s.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span style={{ color: '#888', fontSize: 10, fontWeight: 600 }}>ROTEIRO</span>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['#ato1', '#ato2', '#ato3'].map(t => (
                <span key={t} style={{ background: `${accent}20`, color: accent, fontSize: 8, padding: '1px 5px', borderRadius: 3 }}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Adultos 25–55' },
            { icon: '🎭', label: 'Tom', value: 'Emocional / Cinematográfico' },
            { icon: '📢', label: 'CTA', value: 'Brand awareness' },
            { icon: '🎬', label: 'Formato', value: '60s • Formato longo' },
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
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
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
