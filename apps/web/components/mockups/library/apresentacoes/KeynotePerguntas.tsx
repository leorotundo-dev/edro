'use client';

import React from 'react';

interface KeynotePerguntasProps {
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

export const KeynotePerguntas: React.FC<KeynotePerguntasProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const contactInfo = body ?? text ?? caption ?? description ?? 'contato@empresa.com.br';
  const presenterName = name ?? username ?? brandName ?? 'Nome do Apresentador';
  const presenterRole = headline ?? title ?? 'Cargo / Empresa';

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        textAlign: 'center',
        padding: '24px 48px',
      }}
    >
      {/* Large speech bubble SVG */}
      <div style={{ position: 'relative', marginBottom: '18px' }}>
        <svg
          width="110"
          height="90"
          viewBox="0 0 110 90"
          fill="none"
          aria-label="Balão de fala"
          style={{ filter: `drop-shadow(0 4px 12px ${accent}33)` }}
        >
          {/* Bubble body */}
          <rect x="2" y="2" width="106" height="72" rx="14" fill={`${accent}14`} stroke={accent} strokeWidth="2.5" />
          {/* Tail */}
          <path d="M 28 74 L 18 88 L 50 74" fill={`${accent}14`} stroke={accent} strokeWidth="2.5" strokeLinejoin="round" />
          {/* Question mark inside */}
          <text
            x="55"
            y="52"
            textAnchor="middle"
            fill={accent}
            fontSize="38"
            fontWeight="900"
            fontFamily="'Segoe UI', system-ui, sans-serif"
          >
            ?
          </text>
        </svg>
      </div>

      {/* Main text */}
      <h1
        style={{
          fontSize: '34px',
          fontWeight: 900,
          color: '#111827',
          margin: '0 0 8px',
          lineHeight: 1.15,
        }}
      >
        Perguntas?
      </h1>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px', lineHeight: 1.5 }}>
        Fico à disposição para esclarecer suas dúvidas
      </p>

      {/* Contact info row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '10px 20px',
          background: '#f9fafb',
          borderRadius: '10px',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Avatar placeholder */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: `${accent}18`,
            border: `2px solid ${accent}44`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </div>

        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: '12px', color: '#111827' }}>{presenterName}</div>
          <div style={{ fontSize: '10px', color: '#6b7280' }}>{presenterRole}</div>
        </div>

        <div style={{ width: '1px', height: '30px', background: '#e5e7eb', flexShrink: 0 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <path d="M22 6l-10 7L2 6" />
          </svg>
          <span style={{ fontSize: '11px', color: accent, fontWeight: 500 }}>{contactInfo}</span>
        </div>
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Q&A
      </div>
    </div>
  );
};
