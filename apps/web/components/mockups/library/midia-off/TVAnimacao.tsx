'use client';

import React from 'react';

interface TVAnimacaoProps {
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

export const TVAnimacao: React.FC<TVAnimacaoProps> = ({
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
  brandColor = '#F59E0B',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Animação que dá vida à sua marca.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Motion graphics e personagens animados criam uma identidade visual única e memorável para sua campanha.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#F59E0B';

  const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes anim-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .anim-dot1 { animation: anim-bounce 0.8s ease-in-out infinite; }
        .anim-dot2 { animation: anim-bounce 0.8s ease-in-out infinite 0.15s; }
        .anim-dot3 { animation: anim-bounce 0.8s ease-in-out infinite 0.3s; }
        @keyframes anim-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .anim-spin { animation: anim-spin 4s linear infinite; }
        @keyframes anim-rainbow { 0%{color:#EF4444} 20%{color:#F59E0B} 40%{color:#10B981} 60%{color:#3B82F6} 80%{color:#8B5CF6} 100%{color:#EF4444} }
        .anim-rainbow { animation: anim-rainbow 3s linear infinite; }
      `}</style>

      {/* Header — colorful animation style */}
      <div style={{ background: 'linear-gradient(135deg, #1a0a2e 0%, #0a1a2e 100%)', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: `linear-gradient(135deg, ${accent}, #EC4899)`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>ANIMAÇÃO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Animado</div>
          <div style={{ color: '#666', fontSize: 10 }}>Motion Graphics • 2D/3D</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span className="anim-dot1" style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
          <span className="anim-dot2" style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} />
          <span className="anim-dot3" style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Animation preview area */}
      <div style={{ background: '#0a0a1a', padding: 16, position: 'relative', overflow: 'hidden' }}>
        {/* Background circles */}
        {colors.map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: 60 + i * 20,
            height: 60 + i * 20,
            borderRadius: '50%',
            border: `1px solid ${c}30`,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%)`,
            pointerEvents: 'none',
          }} />
        ))}
        <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1 }}>
          {/* 3 animation frames */}
          {[
            { label: 'Cena 01', sublabel: 'Intro', bg: 'linear-gradient(135deg, #1a0a2e, #2e1a0a)' },
            { label: 'Cena 02', sublabel: 'Ação', bg: 'linear-gradient(135deg, #0a1a0a, #1a2e0a)' },
            { label: 'Cena 03', sublabel: 'Fechamento', bg: 'linear-gradient(135deg, #0a0a2e, #1a0a1a)' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid #333' }}>
              {i === 1 && img
                ? <img src={img} alt="frame" style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 70, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="anim-spin" style={{ width: 24, height: 24 }}>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <path d="M12 2l3 7h7l-6 4 3 7-7-4-7 4 3-7-6-4h7z" fill={colors[i * 2]} opacity="0.8"/>
                      </svg>
                    </div>
                  </div>
              }
              <div style={{ padding: '4px 6px', background: '#111' }}>
                <span style={{ color: accent, fontSize: 8, fontWeight: 700, display: 'block' }}>{f.label}</span>
                <span style={{ color: '#888', fontSize: 9 }}>{f.sublabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Color palette */}
      <div style={{ padding: '10px 16px 0', background: '#141414' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1 }}>PALETA DE CORES</span>
          <div style={{ flex: 1, height: 1, background: '#2a2a2a' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {colors.map((c, i) => (
            <div key={i} style={{ flex: 1, height: 20, borderRadius: 4, background: c, boxShadow: `0 2px 8px ${c}60` }} />
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span style={{ color: '#888', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>CONCEITO CRIATIVO</span>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Tech specs */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Técnica', value: 'Motion 2D' },
            { label: 'FPS', value: '24 fps' },
            { label: 'Resolução', value: '1080p HD' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 8px', textAlign: 'center' }}>
              <div style={{ color: '#666', fontSize: 9 }}>{d.label}</div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{d.value}</div>
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
