'use client';

import React from 'react';

interface EbookCapituloProps {
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

export const EbookCapitulo: React.FC<EbookCapituloProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Fundamentos do Aprendizado Acelerado';
  const resolvedChapterLabel = name ?? username ?? brandName ?? 'Capítulo';
  const resolvedBody =
    body ?? text ?? description ?? caption ??
    'Neste capítulo, exploraremos as bases neurocientíficas que sustentam o aprendizado eficiente. Compreender como o cérebro processa e retém informações é o primeiro passo para transformar sua rotina de estudos.';
  const accent = brandColor;
  const chapterNumber = '01';

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '400px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        fontFamily: 'Georgia, serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: '6px',
          background: accent,
        }}
      />

      {/* Main content */}
      <div style={{ padding: '48px 48px 40px 60px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Huge chapter number — decorative */}
        <div
          style={{
            fontSize: '120px',
            fontWeight: 900,
            color: '#f0f0f0',
            lineHeight: 1,
            marginBottom: '-20px',
            letterSpacing: '-6px',
            fontFamily: 'system-ui, sans-serif',
            userSelect: 'none',
          }}
        >
          {chapterNumber}
        </div>

        {/* Chapter label */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: accent,
            fontFamily: 'system-ui, sans-serif',
            marginBottom: '8px',
          }}
        >
          {resolvedChapterLabel}
        </div>

        {/* Chapter title */}
        <h1
          style={{
            margin: 0,
            fontSize: '26px',
            fontWeight: 800,
            color: '#1a1a2e',
            lineHeight: 1.25,
            marginBottom: '24px',
          }}
        >
          {resolvedTitle}
        </h1>

        {/* Decorative rule */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ width: '40px', height: '2px', background: accent, borderRadius: '2px' }} />
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, opacity: 0.4 }} />
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>

        {/* Opening paragraph */}
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#4b5563',
            lineHeight: 1.8,
            flex: 1,
          }}
        >
          {resolvedBody}
        </p>

        {/* Bottom navigation hint */}
        <div
          style={{
            marginTop: '32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '16px',
          }}
        >
          <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>
            {resolvedChapterLabel} {chapterNumber}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e5e7eb' }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e5e7eb' }} />
          </div>
          <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'system-ui, sans-serif' }}>p. 12</span>
        </div>
      </div>
    </div>
  );
};
