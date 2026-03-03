'use client';

import React from 'react';

interface TVCinemaProps {
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

export const TVCinema: React.FC<TVCinemaProps> = ({
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
  brandColor = '#D4AF37',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Para exibição nas maiores telas do país.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Produção cinematográfica em 4K, som Dolby e proporção 2.35:1 para impacto máximo antes do filme.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#D4AF37';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#080808', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.7)' }}>
      <style>{`
        @keyframes cinema-curtain { 0%,100%{opacity:0.6} 50%{opacity:1} }
        .cinema-curtain { animation: cinema-curtain 3s ease-in-out infinite; }
        @keyframes cinema-star { 0%{opacity:0.2} 50%{opacity:1} 100%{opacity:0.2} }
        .cinema-star { animation: cinema-star 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#100800', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#000"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="#000"/></svg>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>CINEMA</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial para Cinema</div>
          <div style={{ color: '#888', fontSize: 10 }}>Exibição pré-filme • Salas nacionais</div>
        </div>
        <div style={{ background: '#1a1200', border: `1px solid ${accent}60`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>4K • 2.35:1</span>
        </div>
      </div>

      {/* Cinematic frame — letterbox ratio */}
      <div style={{ position: 'relative', background: '#000' }}>
        {/* Top letterbox bar */}
        <div style={{ height: 18, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: 1, width: '60%', background: `${accent}30` }} />
        </div>

        {/* Main frame */}
        <div style={{ position: 'relative', height: 120, background: '#0a0a0a', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {img
            ? <img src={img} alt="cinema" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            : (
              <div style={{ position: 'relative', textAlign: 'center' }}>
                {/* Film grain dots */}
                {[...Array(8)].map((_, i) => (
                  <span key={i} className="cinema-star" style={{ position: 'absolute', width: 2, height: 2, background: accent, borderRadius: '50%', top: Math.sin(i) * 40, left: (i - 3.5) * 16, animationDelay: `${i * 0.25}s` }} />
                ))}
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={`${accent}60`} strokeWidth="1">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
            )
          }
          {/* Vignette overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)', pointerEvents: 'none' }} />
          {/* Badge */}
          <div style={{ position: 'absolute', top: 8, left: 8, background: `${accent}20`, border: `1px solid ${accent}60`, borderRadius: 4, padding: '3px 8px' }}>
            <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>PARA EXIBIÇÃO EM CINEMAS</span>
          </div>
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', borderRadius: 4, padding: '2px 6px' }}>
            <span style={{ color: '#888', fontSize: 9 }}>Dolby Atmos</span>
          </div>
        </div>

        {/* Bottom letterbox bar */}
        <div style={{ height: 18, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ height: 1, width: '60%', background: `${accent}30` }} />
        </div>
      </div>

      {/* Film strip decoration */}
      <div style={{ background: '#111', padding: '8px 16px', display: 'flex', gap: 4 }}>
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{ flex: 1, height: 16, background: '#1a1a1a', borderRadius: 2, border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '60%', height: '60%', background: i % 3 === 0 ? `${accent}40` : '#333', borderRadius: 1 }} />
          </div>
        ))}
      </div>

      {/* Script */}
      <div style={{ padding: '12px 16px', background: '#141414' }}>
        <div style={{ background: '#0f0c00', border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z"/></svg>
            <span style={{ color: accent, fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>ROTEIRO / DIREÇÃO</span>
          </div>
          <p style={{ color: '#ddd', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { label: 'Resolução', value: '4K' },
            { label: 'Proporção', value: '2.35:1' },
            { label: 'Áudio', value: 'Dolby' },
            { label: 'Duração', value: '30s' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0f0c00', border: `1px solid ${accent}20`, borderRadius: 5, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: 8 }}>{d.label}</div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#080800', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Circuitos</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'Cinemark', color: accent }, { label: 'Cinépolis', color: '#60a5fa' }, { label: 'Kinoplex', color: '#a78bfa' }].map((ch, i) => (
            <div key={i} style={{ background: '#111', border: `1px solid ${ch.color}40`, borderRadius: 4, padding: '3px 8px' }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
