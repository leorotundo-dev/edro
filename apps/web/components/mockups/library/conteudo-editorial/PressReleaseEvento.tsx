'use client';

import React from 'react';

interface PressReleaseEventoProps {
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

export const PressReleaseEvento: React.FC<PressReleaseEventoProps> = ({
  name,
  username,
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
  profileImage,
  brandColor = '#0f766e',
}) => {
  const resolvedBrand = brandName || name || username || 'Empresa Digital Ltda.';
  const resolvedEventName = headline || title || 'Summit de Inovação Digital 2025';
  const resolvedBody = body || text || description || caption || 'Um evento exclusivo que reúne líderes, especialistas e inovadores do setor digital para debater as tendências que moldarão os próximos anos.';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#0f766e';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes pre-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .pre-wrap { animation: pre-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div
        className="pre-wrap"
        style={{ width: '400px', background: '#ffffff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.09)', border: '1px solid #e5e7eb' }}
      >
        {/* Letterhead */}
        <div style={{ background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrand} style={{ height: '28px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            ) : (
              <div style={{ width: '30px', height: '30px', borderRadius: '7px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 900 }}>
                {initial}
              </div>
            )}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{resolvedBrand}</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', marginTop: '1px' }}>Assessoria de Imprensa</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Release</div>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: 700 }}>03/03/2026</div>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          {/* FOR IMMEDIATE RELEASE banner */}
          <div style={{ background: `${accent}12`, border: `1px solid ${accent}33`, borderRadius: '6px', padding: '7px 12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Para Divulgação Imediata
            </span>
          </div>

          {/* Event name headline */}
          <h1 style={{ fontSize: '18px', fontWeight: 900, color: '#111827', lineHeight: 1.25, margin: '0 0 14px', letterSpacing: '-0.02em' }}>
            {resolvedBrand} anuncia: {resolvedEventName}
          </h1>

          {/* Event details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {[
              { icon: '📅', label: 'Data', value: '15 de maio de 2025' },
              { icon: '🕐', label: 'Horário', value: '9h às 18h (GMT-3)' },
              { icon: '📍', label: 'Local', value: 'São Paulo Expo · SP' },
              { icon: '🎯', label: 'Formato', value: 'Presencial + Online' },
            ].map((d) => (
              <div key={d.label} style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0 }}>{d.icon}</span>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', marginTop: '2px' }}>{d.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.65, margin: '0 0 14px' }}>
            {resolvedBody}
          </p>

          {/* Body placeholder lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
            {[92, 100, 85, 96, 78].map((w, i) => (
              <div key={i} style={{ height: '8px', background: '#f3f4f6', borderRadius: '3px', width: `${w}%` }} />
            ))}
          </div>

          {/* Embargo note */}
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '7px', padding: '10px 12px', marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 800, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nota de Embargo</div>
              <div style={{ fontSize: '11px', color: '#78350f', marginTop: '2px', lineHeight: 1.4 }}>
                Não publicar antes de 10 de maio de 2025, às 00h01 (Horário de Brasília).
              </div>
            </div>
          </div>

          {/* Contact + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Contato de Imprensa</div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>Camila Torres — Assessora de Imprensa</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px' }}>imprensa@empresadigital.com.br · (11) 3333-4444</div>
            </div>
            <button
              type="button"
              aria-label="Baixar press release do evento em PDF"
              style={{ background: accent, color: '#fff', border: 'none', borderRadius: '8px', padding: '9px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
