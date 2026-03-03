'use client';

import React from 'react';

interface KeynoteCapaProps {
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
  themeColor?: string;
}

export const KeynoteCapa: React.FC<KeynoteCapaProps> = ({
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
  brandColor,
  themeColor,
}) => {
  const accent = brandColor ?? themeColor ?? '#6366F1';
  const resolvedTitle = title ?? headline ?? brandName ?? 'Inovação em Foco';
  const resolvedSubtitle = body ?? caption ?? description ?? text ?? 'Uma apresentação sobre o futuro do nosso negócio';
  const resolvedName = name ?? username ?? 'Maria Silva';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const today = new Date();
  const dateStr = today.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  // Derive a darker shade for gradient
  const accentDark = accent;

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: `linear-gradient(135deg, ${accent}f0 0%, ${accent}80 50%, #1a1a2e 100%)`,
      }}
    >
      {/* Background geometric shapes */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          left: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50px',
          left: '30px',
          width: '3px',
          height: '200px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '2px',
        }}
      />

      {/* Background image overlay */}
      {resolvedImage && (
        <img
          src={resolvedImage}
          alt="Capa"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.08,
          }}
        />
      )}

      {/* Top label */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          right: '18px',
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: '20px',
          padding: '3px 10px',
          fontSize: '9px',
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
        }}
      >
        Apresentação
      </div>

      {/* Main content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 60px',
          textAlign: 'center',
        }}
      >
        {/* Decorative line above title */}
        <div
          style={{
            width: '48px',
            height: '3px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '2px',
            marginBottom: '20px',
          }}
        />

        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.1,
            margin: '0 0 14px 0',
            letterSpacing: '-0.5px',
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          {resolvedTitle}
        </h1>

        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.8)',
            margin: '0 0 28px 0',
            lineHeight: 1.5,
            maxWidth: '380px',
            fontWeight: 400,
          }}
        >
          {resolvedSubtitle}
        </p>

        {/* Divider */}
        <div
          style={{
            width: '60px',
            height: '1px',
            background: 'rgba(255,255,255,0.4)',
            marginBottom: '20px',
          }}
        />

        {/* Presenter + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 700,
              color: '#fff',
              overflow: 'hidden',
            }}
          >
            {resolvedName.charAt(0).toUpperCase()}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{resolvedName}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{dateStr}</div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'rgba(255,255,255,0.3)',
        }}
      />
    </div>
  );
};
