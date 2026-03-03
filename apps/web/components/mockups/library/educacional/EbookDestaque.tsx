'use client';

import React from 'react';

interface EbookDestaqueProps {
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

export const EbookDestaque: React.FC<EbookDestaqueProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Ponto-Chave';
  const resolvedBody =
    body ?? text ?? description ??
    'A repetição espaçada aumenta a retenção de longo prazo em até 80% comparada à leitura linear repetitiva. Aplique essa técnica revisando o conteúdo em intervalos crescentes: 1 dia, 3 dias, 7 dias, 21 dias.';
  const resolvedTip = caption ?? name ?? username ?? 'Dica prática: use cartões de revisão!';
  const resolvedPublisher = brandName ?? 'EduPress';
  const accent = brandColor;

  // Derive a lighter bg from accent — we just use a fixed tint approach
  const lightBg = `${accent}18`;
  const mediumBg = `${accent}30`;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '320px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, sans-serif',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0px',
      }}
    >
      {/* Callout box */}
      <div
        style={{
          background: lightBg,
          border: `2px solid ${accent}`,
          borderLeft: `6px solid ${accent}`,
          borderRadius: '8px',
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Bulb icon */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21h6" />
              <path d="M12 3C8.5 3 6 6 6 9c0 2.5 1.5 4.5 3 5.5V17h6v-2.5c1.5-1 3-3 3-5.5 0-3-2.5-6-6-6z" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: accent,
                marginBottom: '2px',
              }}
            >
              Destaque
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 800,
                color: '#111827',
                lineHeight: 1.2,
              }}
            >
              {resolvedTitle}
            </h2>
          </div>
        </div>

        {/* Body text */}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#374151',
            lineHeight: 1.75,
          }}
        >
          {resolvedBody}
        </p>

        {/* Tip row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: mediumBg,
            borderRadius: '6px',
            padding: '10px 14px',
          }}
        >
          {/* Star icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="1">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span
            style={{
              fontSize: '13px',
              color: '#1f2937',
              fontWeight: 600,
              fontStyle: 'italic',
            }}
          >
            {resolvedTip}
          </span>
        </div>
      </div>

      {/* Publisher watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '14px',
          fontSize: '9px',
          color: '#d1d5db',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        {resolvedPublisher}
      </div>
    </div>
  );
};
