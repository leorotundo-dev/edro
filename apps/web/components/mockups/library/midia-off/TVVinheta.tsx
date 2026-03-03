'use client';

import React from 'react';

interface TVVinhetaProps {
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

export const TVVinheta: React.FC<TVVinhetaProps> = ({
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
  brandColor = '#E11D48',
}) => {
  const brand = brandName ?? name ?? 'Canal';
  const headlineText = headline ?? title ?? 'Identidade sonora e visual da emissora.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Vinheta de identidade do canal: animação de marca de 5 segundos com motion graphic e assinatura sonora.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#E11D48';

  const motionLayers = [
    { shape: 'circle', size: 60, x: 30, y: 50, opacity: 0.15, delay: '0s', dur: '3s' },
    { shape: 'circle', size: 40, x: 70, y: 40, opacity: 0.2, delay: '0.3s', dur: '2.5s' },
    { shape: 'rect', size: 30, x: 55, y: 65, opacity: 0.1, delay: '0.6s', dur: '2s' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0a0508', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <style>{`
        @keyframes vinh-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
        .vinh-spin { animation: vinh-spin 8s linear infinite; }
        @keyframes vinh-pulse { 0%,100%{transform:scale(1);opacity:0.3} 50%{transform:scale(1.4);opacity:0.7} }
        .vinh-pulse { animation: vinh-pulse 3s ease-in-out infinite; }
        .vinh-pulse2 { animation: vinh-pulse 3s ease-in-out infinite 0.5s; }
        .vinh-pulse3 { animation: vinh-pulse 3s ease-in-out infinite 1s; }
        @keyframes vinh-logo { 0%,100%{opacity:0.8;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        .vinh-logo { animation: vinh-logo 2s ease-in-out infinite; }
        @keyframes vinh-bar { 0%{width:0%} 100%{width:100%} }
        .vinh-bar { animation: vinh-bar 5s ease-in-out infinite alternate; }
        @keyframes vinh-orbit { 0%{transform:rotate(0deg) translateX(28px) rotate(0deg)} 100%{transform:rotate(360deg) translateX(28px) rotate(-360deg)} }
        .vinh-orbit { animation: vinh-orbit 4s linear infinite; }
        .vinh-orbit2 { animation: vinh-orbit 4s linear infinite 1.33s; }
        .vinh-orbit3 { animation: vinh-orbit 4s linear infinite 2.66s; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#150810', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>VINHETA</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Vinheta de Abertura</div>
          <div style={{ color: '#888', fontSize: 10 }}>ID de canal • Motion graphic</div>
        </div>
        <div style={{ background: accent, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>5s</span>
        </div>
      </div>

      {/* Animated motion graphic preview */}
      <div style={{ position: 'relative', height: 140, background: '#000', overflow: 'hidden' }}>
        {img
          ? <img src={img} alt="vinheta" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
          : null
        }
        {/* Background radial glow */}
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${accent}20 0%, #000 70%)` }} />

        {/* Orbiting shapes */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="vinh-orbit" style={{ position: 'absolute', width: 8, height: 8, background: accent, borderRadius: '50%', marginLeft: -4, marginTop: -4 }} />
          <div className="vinh-orbit2" style={{ position: 'absolute', width: 6, height: 6, background: `${accent}aa`, borderRadius: '50%', marginLeft: -3, marginTop: -3 }} />
          <div className="vinh-orbit3" style={{ position: 'absolute', width: 5, height: 5, background: `${accent}66`, borderRadius: '50%', marginLeft: -2.5, marginTop: -2.5 }} />
        </div>

        {/* Spinning ring */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 80, height: 80 }}>
          <div className="vinh-spin" style={{ width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${accent}30`, borderTopColor: accent }} />
        </div>

        {/* Pulsing circles */}
        <div className="vinh-pulse" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 120, height: 120, borderRadius: '50%', background: `${accent}08`, border: `1px solid ${accent}20` }} />
        <div className="vinh-pulse2" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 90, height: 90, borderRadius: '50%', background: `${accent}08`, border: `1px solid ${accent}30` }} />
        <div className="vinh-pulse3" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 60, height: 60, borderRadius: '50%', background: `${accent}12`, border: `1px solid ${accent}40` }} />

        {/* Channel logo center */}
        <div className="vinh-logo" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 10 }}>
          <div style={{ background: `${accent}`, borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accent}60` }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: -1 }}>{brand.substring(0, 2).toUpperCase()}</span>
          </div>
        </div>

        {/* Duration badge */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.8)', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontSize: 10, fontWeight: 700 }}>00:05</span>
        </div>

        {/* Timeline bar at bottom */}
        <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10 }}>
          <div style={{ height: 3, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
            <div className="vinh-bar" style={{ height: '100%', background: accent, borderRadius: 2 }} />
          </div>
        </div>
      </div>

      {/* Animation timeline */}
      <div style={{ padding: '12px 16px 8px', background: '#0f080c' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>TIMELINE DE ANIMAÇÃO (5s)</div>
        <div style={{ display: 'flex', gap: 1 }}>
          {[
            { label: '0–1s', desc: 'Black', bg: '#000', active: false },
            { label: '1–2s', desc: 'Intro', bg: `${accent}20`, active: true },
            { label: '2–4s', desc: 'Logo', bg: `${accent}40`, active: true },
            { label: '4–5s', desc: 'Fade', bg: `${accent}15`, active: false },
          ].map((t, i) => (
            <div key={i} style={{ flex: i === 2 ? 2 : 1, background: t.bg, border: `1px solid ${t.active ? accent + '50' : '#222'}`, borderRadius: i === 0 ? '4px 0 0 4px' : i === 3 ? '0 4px 4px 0' : 0, padding: '6px 6px', textAlign: 'center' }}>
              <div style={{ color: t.active ? accent : '#555', fontSize: 8, fontWeight: 700 }}>{t.label}</div>
              <div style={{ color: '#444', fontSize: 7 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Motion specs */}
      <div style={{ padding: '0 16px 10px', background: '#0f080c' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Duração', value: '5s' },
            { label: 'FPS', value: '30fps' },
            { label: 'Codec', value: 'H.264' },
            { label: 'Resolução', value: '1920×1080' },
            { label: 'Audio', value: 'WAV 48kHz' },
            { label: 'Canal', value: brand },
          ].map((s, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 5, padding: '5px 8px' }}>
              <div style={{ color: '#555', fontSize: 8 }}>{s.label}</div>
              <div style={{ color: accent, fontSize: 10, fontWeight: 700 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0f080c' }}>
        <div style={{ background: '#111', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#080408', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Canal</span>
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
