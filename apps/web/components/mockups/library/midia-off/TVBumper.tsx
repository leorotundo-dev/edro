'use client';

import React from 'react';

interface TVBumperProps {
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

export const TVBumper: React.FC<TVBumperProps> = ({
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
  brandColor = '#F97316',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Identidade em 5 segundos.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Logo animation + tagline. Impacto máximo no menor tempo possível.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#F97316';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes bumper-flash { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.95)} }
        .bumper-flash { animation: bumper-flash 0.5s ease-in-out infinite; }
        @keyframes bumper-ring { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(1.4);opacity:0} }
        .bumper-ring { animation: bumper-ring 1.2s ease-out infinite; }
        @keyframes bumper-count { 0%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* Header — minimal, ultra-tight */}
      <div style={{ background: '#111', borderBottom: `4px solid ${accent}`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 11, letterSpacing: 1 }}>TV</span>
        </div>
        <span style={{ color: '#ccc', fontSize: 12, flex: 1 }}>Bumper / Vinheta Comercial</span>
        <div style={{ background: accent, borderRadius: 20, padding: '3px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 14 }}>5s</span>
        </div>
      </div>

      {/* Main bumper preview */}
      <div style={{ background: '#000', padding: 0, position: 'relative', height: 140, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img
          ? <img src={img} alt="bumper" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.4 }} />
          : null
        }
        {/* Concentric rings animation */}
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div className="bumper-ring" style={{ position: 'absolute', inset: 0, border: `2px solid ${accent}`, borderRadius: '50%' }} />
          <div className="bumper-ring" style={{ position: 'absolute', inset: 0, border: `2px solid ${accent}`, borderRadius: '50%', animationDelay: '0.4s' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="bumper-flash" style={{ width: 50, height: 50, background: accent, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
            </div>
          </div>
        </div>
        {/* Countdown strip */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: '#1a1a1a' }}>
          <div style={{ height: '100%', background: accent, width: '100%' }} />
        </div>
        {/* Frame marks */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 4 }}>
          {[5,4,3,2,1].map(n => (
            <div key={n} style={{ width: 18, height: 18, borderRadius: 3, background: n <= 3 ? accent : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>{n}</span>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '2px 6px' }}>
          <span style={{ color: accent, fontSize: 10, fontWeight: 700 }}>ON AIR</span>
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '12px 16px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style={{ color: '#888', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>CONCEITO • 5 SEGUNDOS</span>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {[
            { label: 'Duração', value: '5s' },
            { label: 'Tipo', value: 'Bumper' },
            { label: 'Uso', value: 'Pre-roll' },
            { label: 'Skip', value: 'Não' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 5, padding: '6px 8px', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 8 }}>{d.label}</div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '8px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
