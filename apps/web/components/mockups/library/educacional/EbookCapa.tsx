'use client';

import React from 'react';

interface EbookCapaProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  brandColor?: string;
}

export const EbookCapa: React.FC<EbookCapaProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Guia Definitivo de Aprendizado';
  const resolvedSubtitle = description ?? caption ?? 'Estratégias comprovadas para aprender mais rápido e reter mais';
  const resolvedAuthor = name ?? username ?? 'Prof. Ana Souza';
  const resolvedPublisher = brandName ?? 'EduPress';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const accent = brandColor;

  const hasImage = Boolean(resolvedImage);

  return (
    <div
      style={{
        position: 'relative',
        width: '300px',
        height: '400px',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        fontFamily: 'Georgia, serif',
        display: 'flex',
        flexDirection: 'column',
        background: hasImage
          ? `url(${resolvedImage}) center/cover no-repeat`
          : `linear-gradient(160deg, ${accent} 0%, #1a1a2e 100%)`,
      }}
    >
      {/* Overlay when image */}
      {hasImage && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.75) 100%)',
          }}
        />
      )}

      {/* Top accent stripe */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: hasImage ? accent : 'rgba(255,255,255,0.3)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '32px 24px 24px',
        }}
      >
        {/* Category label */}
        <div
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: accent,
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: '2px',
            marginBottom: '20px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          E-book
        </div>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: '12px',
            textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {resolvedTitle}
        </h1>

        {/* Decorative line */}
        <div
          style={{
            width: '40px',
            height: '3px',
            background: accent,
            borderRadius: '2px',
            marginBottom: '14px',
          }}
        />

        {/* Subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: 'rgba(255,255,255,0.85)',
            lineHeight: 1.5,
            fontStyle: 'italic',
            flex: 1,
          }}
        >
          {resolvedSubtitle}
        </p>

        {/* Illustration area placeholder */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {!hasImage && (
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          )}
        </div>

        {/* Bottom: author + publisher */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'system-ui, sans-serif', marginBottom: '2px' }}>Autor</div>
            <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700, fontFamily: 'system-ui, sans-serif' }}>{resolvedAuthor}</div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '9px',
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 600,
              letterSpacing: '1px',
            }}
          >
            {resolvedPublisher}
          </div>
        </div>
      </div>

      {/* Body text overlay (hidden decorative) — uses body/text prop for aria */}
      <span style={{ display: 'none' }}>{text ?? body}</span>
    </div>
  );
};
