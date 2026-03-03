'use client';

import React from 'react';

interface CertificadoProps {
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

export const Certificado: React.FC<CertificadoProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#1d4ed8',
}) => {
  const recipientName = name ?? username ?? 'Maria Eduarda Ferreira';
  const courseTitle = title ?? headline ?? 'Desenvolvimento Web Completo';
  const institution = brandName ?? 'Instituto Nacional de Educação';
  const courseDuration = body ?? caption ?? description ?? text ?? '120 horas — Modalidade EAD';

  return (
    <div style={{ width: '700px', height: '495px', backgroundColor: '#fffdf7', fontFamily: "'Georgia', 'Times New Roman', serif", position: 'relative', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>

      {/* Outer ornate border */}
      <div style={{ position: 'absolute', inset: '10px', border: `3px solid ${brandColor}`, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: '16px', border: `1px solid ${brandColor}55`, pointerEvents: 'none' }} />

      {/* Corner ornaments — top-left */}
      <svg width="60" height="60" style={{ position: 'absolute', top: '6px', left: '6px' }} viewBox="0 0 60 60">
        <path d="M0 0 L60 0 L60 8 L8 8 L8 60 L0 60 Z" fill={brandColor} opacity="0.15" />
        <path d="M0 0 L30 0 L30 4 L4 4 L4 30 L0 30 Z" fill={brandColor} opacity="0.4" />
        <circle cx="8" cy="8" r="4" fill={brandColor} opacity="0.5" />
      </svg>
      {/* top-right */}
      <svg width="60" height="60" style={{ position: 'absolute', top: '6px', right: '6px' }} viewBox="0 0 60 60">
        <path d="M60 0 L0 0 L0 8 L52 8 L52 60 L60 60 Z" fill={brandColor} opacity="0.15" />
        <path d="M60 0 L30 0 L30 4 L56 4 L56 30 L60 30 Z" fill={brandColor} opacity="0.4" />
        <circle cx="52" cy="8" r="4" fill={brandColor} opacity="0.5" />
      </svg>
      {/* bottom-left */}
      <svg width="60" height="60" style={{ position: 'absolute', bottom: '6px', left: '6px' }} viewBox="0 0 60 60">
        <path d="M0 60 L60 60 L60 52 L8 52 L8 0 L0 0 Z" fill={brandColor} opacity="0.15" />
        <path d="M0 60 L30 60 L30 56 L4 56 L4 30 L0 30 Z" fill={brandColor} opacity="0.4" />
        <circle cx="8" cy="52" r="4" fill={brandColor} opacity="0.5" />
      </svg>
      {/* bottom-right */}
      <svg width="60" height="60" style={{ position: 'absolute', bottom: '6px', right: '6px' }} viewBox="0 0 60 60">
        <path d="M60 60 L0 60 L0 52 L52 52 L52 0 L60 0 Z" fill={brandColor} opacity="0.15" />
        <path d="M60 60 L30 60 L30 56 L56 56 L56 30 L60 30 Z" fill={brandColor} opacity="0.4" />
        <circle cx="52" cy="52" r="4" fill={brandColor} opacity="0.5" />
      </svg>

      {/* Top color strip */}
      <div style={{ backgroundColor: brandColor, height: '6px', width: '100%' }} />

      {/* Content */}
      <div style={{ padding: '28px 60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'calc(100% - 12px)' }}>

        {/* Institution seal area */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: `2px solid ${brandColor}`, backgroundColor: `${brandColor}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
              <path d="M6 12v5c3 3 9 3 12 0v-5"/>
            </svg>
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: brandColor, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'system-ui' }}>{institution}</div>
        </div>

        {/* CERTIFICADO heading */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.3em', color: '#94a3b8', textTransform: 'uppercase', fontFamily: 'system-ui', marginBottom: '4px' }}>certifica que</div>
          <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 400, color: '#1e293b', fontStyle: 'italic', lineHeight: 1.1, letterSpacing: '-0.01em' }}>{recipientName}</h1>
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '80%', marginBottom: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to right, transparent, ${brandColor}60)` }} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill={brandColor} opacity={0.6}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <div style={{ flex: 1, height: '1px', background: `linear-gradient(to left, transparent, ${brandColor}60)` }} />
        </div>

        {/* Course info */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#64748b', fontFamily: 'system-ui' }}>concluiu com aproveitamento o curso de</p>
          <p style={{ margin: '0 0 4px', fontSize: '19px', fontWeight: 700, color: brandColor, fontFamily: 'system-ui' }}>{courseTitle}</p>
          <p style={{ margin: 0, fontSize: '10px', color: '#94a3b8', fontFamily: 'system-ui' }}>{courseDuration}</p>
        </div>

        {/* Signature lines */}
        <div style={{ display: 'flex', justifyContent: 'space-around', width: '80%', marginTop: 'auto' }}>
          {['Diretor Acadêmico', 'Coordenador do Curso'].map((role, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ width: '120px', borderBottom: `1px solid #334155`, marginBottom: '4px' }} />
              <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'system-ui' }}>{role}</div>
            </div>
          ))}
        </div>

        {/* Date */}
        <div style={{ marginTop: '10px', fontSize: '9px', color: '#94a3b8', fontFamily: 'system-ui' }}>São Paulo, março de 2024</div>
      </div>

      {/* Bottom color strip */}
      <div style={{ backgroundColor: brandColor, height: '6px', width: '100%', position: 'absolute', bottom: 0 }} />
    </div>
  );
};
