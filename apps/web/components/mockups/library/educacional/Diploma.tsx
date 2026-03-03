'use client';

import React from 'react';

interface DiplomaProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const Diploma: React.FC<DiplomaProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#92400e',
}) => {
  const recipientName = name ?? username ?? 'João Pedro Almeida Santos';
  const degreeName = title ?? headline ?? 'Licenciatura em Pedagogia';
  const institution = brandName ?? 'Universidade Federal de Educação';
  const detail = body ?? caption ?? description ?? text ?? 'Com distinção e louvor — Turma 2024';

  return (
    <div style={{ width: '380px', height: '530px', backgroundColor: '#fffef5', fontFamily: "'Georgia', serif", position: 'relative', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {/* Gold top bar */}
      <div style={{ width: '100%', height: '8px', background: `linear-gradient(90deg, ${brandColor}, #d97706, ${brandColor})` }} />

      {/* Ornate border frame */}
      <div style={{ position: 'absolute', inset: '14px', border: `2px solid ${brandColor}55`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '20px', border: `1px solid ${brandColor}25`, pointerEvents: 'none' }} />

      {/* Corner florets */}
      {[
        { top: '10px', left: '10px' },
        { top: '10px', right: '10px' },
        { bottom: '10px', left: '10px' },
        { bottom: '10px', right: '10px' },
      ].map((pos, i) => (
        <svg key={i} width="30" height="30" viewBox="0 0 30 30" style={{ position: 'absolute', ...pos }}>
          <circle cx="15" cy="15" r="6" fill="none" stroke={brandColor} strokeWidth="1.5" opacity="0.6" />
          <circle cx="15" cy="15" r="2" fill={brandColor} opacity="0.6" />
          <line x1="15" y1="4" x2="15" y2="8" stroke={brandColor} strokeWidth="1.5" opacity="0.4" />
          <line x1="15" y1="22" x2="15" y2="26" stroke={brandColor} strokeWidth="1.5" opacity="0.4" />
          <line x1="4" y1="15" x2="8" y2="15" stroke={brandColor} strokeWidth="1.5" opacity="0.4" />
          <line x1="22" y1="15" x2="26" y2="15" stroke={brandColor} strokeWidth="1.5" opacity="0.4" />
        </svg>
      ))}

      {/* Content */}
      <div style={{ padding: '30px 44px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', boxSizing: 'border-box' }}>

        {/* University seal */}
        <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: `3px solid ${brandColor}`, background: `radial-gradient(circle, ${brandColor}15, ${brandColor}05)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>

        <div style={{ fontSize: '10px', fontWeight: 700, color: brandColor, letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'system-ui', textAlign: 'center', marginBottom: '4px' }}>{institution}</div>

        {/* DIPLOMA title */}
        <div style={{ fontSize: '28px', fontWeight: 400, color: '#1c1917', letterSpacing: '0.15em', textTransform: 'uppercase', margin: '12px 0 6px', fontFamily: "'Georgia', serif" }}>DIPLOMA</div>

        {/* Decorative rule */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', marginBottom: '14px' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${brandColor}80)` }} />
          <div style={{ width: '6px', height: '6px', transform: 'rotate(45deg)', backgroundColor: brandColor, opacity: 0.7 }} />
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${brandColor}80)` }} />
        </div>

        <p style={{ margin: '0 0 6px', fontSize: '10px', color: '#78716c', textAlign: 'center', fontFamily: 'system-ui', letterSpacing: '0.02em' }}>Conferimos o grau de</p>
        <p style={{ margin: '0 0 10px', fontSize: '16px', fontWeight: 700, color: brandColor, textAlign: 'center', fontFamily: 'system-ui' }}>{degreeName}</p>

        <p style={{ margin: '0 0 4px', fontSize: '10px', color: '#78716c', textAlign: 'center', fontFamily: 'system-ui' }}>ao(à) graduado(a)</p>
        <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 400, color: '#1c1917', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.2 }}>{recipientName}</h2>

        <p style={{ margin: '0 0 20px', fontSize: '9px', color: '#a8a29e', textAlign: 'center', fontFamily: 'system-ui' }}>{detail}</p>

        {/* Signature lines */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '100%', marginTop: 'auto' }}>
          {['Reitor', 'Diretora de Ensino', 'Secretário Acadêmico'].map((role, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', borderBottom: `1px solid #a8a29e`, marginBottom: '3px' }} />
              <div style={{ fontSize: '7px', color: '#a8a29e', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'system-ui' }}>{role}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '12px', fontSize: '8px', color: '#a8a29e', fontFamily: 'system-ui', textAlign: 'center' }}>Reg. nº 2024/0891 · Brasília, 15 de março de 2024</div>
      </div>

      {/* Gold bottom bar */}
      <div style={{ width: '100%', height: '8px', background: `linear-gradient(90deg, ${brandColor}, #d97706, ${brandColor})`, position: 'absolute', bottom: 0 }} />
    </div>
  );
};
