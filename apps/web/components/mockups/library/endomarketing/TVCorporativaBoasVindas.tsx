'use client';

import React from 'react';

interface TVCorporativaBoasVindasProps {
  brandName?: string;
  name?: string;
  title?: string;
  body?: string;
  caption?: string;
  brandColor?: string;
  profileImage?: string;
}

export const TVCorporativaBoasVindas: React.FC<TVCorporativaBoasVindasProps> = ({
  brandName = 'Empresa S.A.',
  name = 'Mariana Oliveira',
  title = 'Analista de Marketing Sênior',
  body = 'Departamento de Comunicação e Marca',
  caption = 'Seja muito bem-vinda à nossa equipe! Estamos felizes em tê-la conosco.',
  brandColor = '#7c3aed',
  profileImage = '',
}) => {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(135deg, #0d0621 0%, #1a0a3d 50%, #0d0621 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes bv-glow { 0%,100%{box-shadow:0 0 20px rgba(124,58,237,0.4)} 50%{box-shadow:0 0 40px rgba(124,58,237,0.8)} }
        @keyframes bv-sparkle { 0%,100%{opacity:0.2;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes bv-slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .bv-avatar { animation: bv-glow 2.5s ease-in-out infinite; }
        .bv-star { animation: bv-sparkle 1.5s ease-in-out infinite; }
        .bv-star:nth-child(2){animation-delay:0.5s}
        .bv-star:nth-child(3){animation-delay:1s}
        .bv-text1 { animation: bv-slide-up 0.6s ease both 0.2s; }
        .bv-text2 { animation: bv-slide-up 0.6s ease both 0.4s; }
        .bv-text3 { animation: bv-slide-up 0.6s ease both 0.6s; }
      `}</style>

      {/* Background orbs */}
      <div style={{
        position: 'absolute', width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${brandColor}30, transparent 70%)`,
        top: -60, right: -40, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 150, height: 150, borderRadius: '50%',
        background: 'radial-gradient(circle, #ec489930, transparent 70%)',
        bottom: -40, left: -30, pointerEvents: 'none',
      }} />

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #ec4899, #06b6d4)` }} />

      {/* Header strip */}
      <div style={{
        padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
          {brandName} · Novos Talentos
        </span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
          {new Date().toLocaleDateString('pt-BR')}
        </span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '16px 32px', gap: 28 }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div className="bv-avatar" style={{
            width: 90, height: 90, borderRadius: '50%',
            border: `3px solid ${brandColor}`,
            background: profileImage ? 'none' : `linear-gradient(135deg, ${brandColor}, #ec4899)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
          }}>
            {profileImage
              ? <img src={profileImage} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontSize: 32, fontWeight: 800 }}>{initials}</span>
            }
          </div>
          {/* Stars */}
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => (
              <div key={i} className="bv-star" style={{ color: '#fbbf24', fontSize: 14 }}>★</div>
            ))}
          </div>
        </div>

        {/* Text */}
        <div style={{ flex: 1 }}>
          <div className="bv-text1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
            Bem-vindo(a) à equipe!
          </div>
          <div className="bv-text2" style={{ color: 'white', fontSize: 30, fontWeight: 900, lineHeight: 1.1, marginBottom: 6 }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 24, height: 2, background: brandColor, borderRadius: 1 }} />
            <span style={{ color: brandColor, fontSize: 12, fontWeight: 600 }}>{title}</span>
          </div>
          <div className="bv-text3" style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 11, marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {body}
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px',
            borderLeft: `3px solid ${brandColor}`,
          }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>
              "{caption}"
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '6px 20px 10px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, letterSpacing: 1 }}>
          FAÇA-A SENTIR-SE EM CASA · EQUIPE {brandName.toUpperCase()}
        </span>
      </div>
    </div>
  );
};
