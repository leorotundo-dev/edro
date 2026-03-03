'use client';

import React from 'react';

interface KeynoteResumoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteResumo: React.FC<KeynoteResumoProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const slideTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Resumo';

  const takeaways = [
    {
      num: '01',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      title: 'Estratégia clara',
      text: 'Alinhamento entre metas e execução',
    },
    {
      num: '02',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
      title: 'Dados comprovam',
      text: '+87% de crescimento documentado',
    },
    {
      num: '03',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      ),
      title: 'Próximos passos',
      text: 'Implementação em 90 dias',
    },
    {
      num: '04',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      title: 'Equipe engajada',
      text: 'Capacitação e suporte contínuos',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#f8f9fa',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '12px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>{slideTitle}</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginLeft: '4px' }}>— Principais aprendizados</span>
      </div>

      {/* Takeaway cards grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          padding: '14px 16px',
        }}
      >
        {takeaways.map((t, i) => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0',
            }}
          >
            {/* Number + icon combo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: `${accent}18`,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {t.icon}
              </div>
              <span style={{ fontSize: '9px', fontWeight: 800, color: `${accent}88`, letterSpacing: '0.3px' }}>
                {t.num}
              </span>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>
                {t.title}
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>{t.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        Resumo
      </div>
    </div>
  );
};
