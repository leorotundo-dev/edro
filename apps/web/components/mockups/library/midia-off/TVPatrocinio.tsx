'use client';

import React from 'react';

interface TVPatrocinioProps {
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

export const TVPatrocinio: React.FC<TVPatrocinioProps> = ({
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
  brandColor = '#8B5CF6',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Apresentado por';
  const bodyText = body ?? caption ?? description ?? text ?? 'Associação estratégica de marca com programação de alto impacto e audiência qualificada.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#8B5CF6';

  const programs = [
    { name: 'Jornal Nacional', time: '20h30', audience: '28M', channel: 'Globo' },
    { name: 'Domingão', time: '15h00', audience: '18M', channel: 'Globo' },
    { name: 'The Voice Brasil', time: '22h00', audience: '14M', channel: 'Globo' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0a1a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes pat-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .pat-shimmer { animation: pat-shimmer 3s linear infinite; background: linear-gradient(90deg, ${accent}40, ${accent}cc, ${accent}40); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        @keyframes pat-pulse { 0%,100%{opacity:0.7;transform:scale(1)} 50%{opacity:1;transform:scale(1.02)} }
        .pat-pulse { animation: pat-pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#140e24', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>PATROCÍNIO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Break de Patrocínio TV</div>
          <div style={{ color: '#888', fontSize: 10 }}>"Apresentado por" • Associação de marca</div>
        </div>
        <div style={{ background: '#1e1230', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>10s</span>
        </div>
      </div>

      {/* Main sponsorship card */}
      <div style={{ background: '#0c0818', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${accent}10 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div className="pat-pulse" style={{ position: 'relative', background: '#140e24', border: `1px solid ${accent}40`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Apresentado por</div>
          {img
            ? <img src={img} alt={brand} style={{ height: 40, maxWidth: 140, objectFit: 'contain', display: 'block', margin: '0 auto 8px' }} />
            : <div style={{ fontSize: 22, fontWeight: 900, color: accent, marginBottom: 8, letterSpacing: 1 }}>{brand}</div>
          }
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginBottom: 8 }} />
          <div style={{ color: '#aaa', fontSize: 11 }}>{headlineText}</div>
        </div>
      </div>

      {/* Program association list */}
      <div style={{ padding: '10px 16px', background: '#141414' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PROGRAMAS PATROCINADOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {programs.map((p, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#ddd', fontSize: 11, fontWeight: 600 }}>{p.name}</span>
                <span style={{ color: '#555', fontSize: 10, marginLeft: 8 }}>{p.channel}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#888', fontSize: 9 }}>{p.time}</div>
                <div style={{ color: accent, fontSize: 10, fontWeight: 700 }}>{p.audience} espect.</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard */}
      <div style={{ padding: '0 16px 10px', background: '#141414' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ESTRUTURA DO BREAK</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: '01', label: 'Vinheta pgm.', sub: '0–3s', bg: '#1a1030' },
            { n: '02', label: 'Logo Marca', sub: '3–7s', bg: '#140e24' },
            { n: '03', label: 'Tagline', sub: '7–10s', bg: '#1a1030' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#1e1e1e', border: `1px solid ${i === 1 ? accent + '60' : '#333'}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 48, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i === 1
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill={accent}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }
              </div>
              <div style={{ padding: '3px 5px', background: '#111' }}>
                <span style={{ color: i === 1 ? accent : '#888', fontSize: 8, fontWeight: 700, display: 'block' }}>#{f.n}</span>
                <span style={{ color: '#aaa', fontSize: 8, display: 'block' }}>{f.label}</span>
                <span style={{ color: '#555', fontSize: 8 }}>{f.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* ROI metrics */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { label: 'Alcance semanal', value: '60M+' },
            { label: 'Freq. exposição', value: '3–5x' },
            { label: 'Brand recall', value: '+42%' },
          ].map((m, i) => (
            <div key={i} style={{ background: '#1a1030', border: `1px solid ${accent}20`, borderRadius: 6, padding: '8px', textAlign: 'center' }}>
              <div style={{ color: accent, fontSize: 16, fontWeight: 900 }}>{m.value}</div>
              <div style={{ color: '#666', fontSize: 8 }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0c0818', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Emissoras</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
