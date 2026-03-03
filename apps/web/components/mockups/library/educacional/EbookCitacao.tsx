'use client';

import React from 'react';

interface EbookCitacaoProps {
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

export const EbookCitacao: React.FC<EbookCitacaoProps> = ({
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
  const resolvedQuote =
    body ?? text ?? description ??
    'A educação não é a preparação para a vida; a educação é a própria vida em seu mais pleno desenvolvimento e expressão.';
  const resolvedAttribution = name ?? username ?? 'John Dewey';
  const resolvedContext = caption ?? headline ?? title ?? 'Filósofo e educador, 1916';
  const resolvedPublisher = brandName ?? 'EduPress';
  const accent = brandColor;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '360px',
        background: '#fafafa',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        fontFamily: 'Georgia, serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 56px',
      }}
    >
      {/* Background decorative quote mark — top left */}
      <div
        style={{
          position: 'absolute',
          top: '-10px',
          left: '20px',
          fontSize: '200px',
          lineHeight: 1,
          color: accent,
          opacity: 0.07,
          fontFamily: 'Georgia, serif',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        &ldquo;
      </div>

      {/* Background decorative quote mark — bottom right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-80px',
          right: '20px',
          fontSize: '200px',
          lineHeight: 1,
          color: accent,
          opacity: 0.07,
          fontFamily: 'Georgia, serif',
          userSelect: 'none',
          pointerEvents: 'none',
          transform: 'rotate(180deg)',
        }}
      >
        &ldquo;
      </div>

      {/* Top accent line */}
      <div
        style={{
          width: '48px',
          height: '4px',
          background: accent,
          borderRadius: '2px',
          marginBottom: '32px',
        }}
      />

      {/* Large opening quote */}
      <div
        style={{
          fontSize: '72px',
          lineHeight: 0.6,
          color: accent,
          marginBottom: '16px',
          fontFamily: 'Georgia, serif',
        }}
      >
        &ldquo;
      </div>

      {/* Quote text */}
      <blockquote
        style={{
          margin: 0,
          fontSize: '18px',
          fontStyle: 'italic',
          color: '#1f2937',
          lineHeight: 1.7,
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {resolvedQuote}
      </blockquote>

      {/* Closing quote */}
      <div
        style={{
          fontSize: '72px',
          lineHeight: 0.6,
          color: accent,
          marginTop: '16px',
          fontFamily: 'Georgia, serif',
          alignSelf: 'flex-end',
        }}
      >
        &rdquo;
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          width: '48px',
          height: '4px',
          background: accent,
          borderRadius: '2px',
          margin: '28px 0 24px',
        }}
      />

      {/* Attribution */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '15px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: 'system-ui, sans-serif',
            marginBottom: '4px',
          }}
        >
          — {resolvedAttribution}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            fontFamily: 'system-ui, sans-serif',
            fontStyle: 'italic',
          }}
        >
          {resolvedContext}
        </div>
      </div>

      {/* Publisher watermark */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '16px',
          fontSize: '9px',
          color: '#d1d5db',
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}
      >
        {resolvedPublisher}
      </div>
    </div>
  );
};
