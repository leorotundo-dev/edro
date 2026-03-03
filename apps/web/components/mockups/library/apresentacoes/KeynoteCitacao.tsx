'use client';

import React from 'react';

interface KeynoteCitacaoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteCitacao: React.FC<KeynoteCitacaoProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const quote =
    body ?? text ?? caption ?? description ??
    'A inovação é o que distingue um líder de um seguidor.';
  const author = name ?? username ?? brandName ?? 'Steve Jobs';
  const role = headline ?? title ?? 'Co-fundador da Apple';
  const avatar = profileImage ?? image ?? postImage ?? thumbnail ?? '';

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
        userSelect: 'none',
      }}
    >
      {/* Decorative large quotation marks */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-18px',
          left: '18px',
          fontSize: '190px',
          lineHeight: 1,
          color: '#f0effe',
          fontFamily: 'Georgia, serif',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        &ldquo;
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '18px',
          fontSize: '190px',
          lineHeight: 1,
          color: '#f0effe',
          fontFamily: 'Georgia, serif',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        &rdquo;
      </span>

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '36px 72px 20px',
          textAlign: 'center',
        }}
      >
        {/* Quote icon */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill={accent}
          aria-hidden="true"
          style={{ opacity: 0.85, marginBottom: '16px', flexShrink: 0 }}
        >
          <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" />
        </svg>

        {/* Quote text */}
        <p
          style={{
            fontSize: '19px',
            fontStyle: 'italic',
            fontWeight: 500,
            color: '#1e1e2e',
            lineHeight: 1.6,
            maxWidth: '390px',
            margin: '0 0 24px',
          }}
        >
          {quote}
        </p>

        {/* Divider */}
        <div
          style={{
            width: '40px',
            height: '2px',
            background: accent,
            borderRadius: '2px',
            marginBottom: '18px',
            opacity: 0.7,
          }}
        />

        {/* Author attribution */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {avatar ? (
            <img
              src={avatar}
              alt={author}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: `2px solid ${accent}`,
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: `${accent}18`,
                border: `2px solid ${accent}44`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          )}
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e1e2e', lineHeight: 1.3 }}>
              {author}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>{role}</div>
          </div>
        </div>
      </div>

      {/* Bottom brand color bar */}
      <div
        style={{
          height: '5px',
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
          flexShrink: 0,
        }}
      />

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
        Citação
      </div>
    </div>
  );
};
