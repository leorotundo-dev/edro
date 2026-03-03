'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface FacebookAdProps {
  /* Studio aliases */
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
  /* Ad-specific */
  brandLogo?: string;
  adImage?: string;
  ctaText?: string;
  websiteUrl?: string;
  websiteDomain?: string;
  likeCount?: string | number;
  commentCount?: string | number;
}

const FB_BLUE = '#1877F2';
const GRAY_TEXT = '#65676B';
const LIGHT_BG = '#E4E6EB';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function formatCount(n: string | number | undefined, fallback: string): string {
  if (n === undefined || n === null) return fallback;
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return String(n);
}

export const FacebookAd: React.FC<FacebookAdProps> = ({
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
  brandLogo,
  adImage,
  ctaText = 'Saiba mais',
  websiteUrl = 'www.exemplo.com.br',
  websiteDomain,
  likeCount,
  commentCount,
}) => {
  const [liked, setLiked] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const displayName = name || brandName || username || 'Nome da Marca';
  const displayLogo = brandLogo || profileImage || '';
  const displayImage = adImage || image || postImage || thumbnail || '';
  const displayHeadline = headline || title || 'Confira nossa nova coleção';
  const displayBody = body || caption || text || description || 'Descubra produtos incríveis com condições especiais para você.';
  const displayDomain = websiteDomain || websiteUrl.replace(/^https?:\/\//, '').split('/')[0].toUpperCase();
  const likes = formatCount(likeCount, '248');
  const comments = formatCount(commentCount, '36');

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#fff',
        border: `1px solid ${LIGHT_BG}`,
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: FONT,
        color: '#050505',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Page avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              overflow: 'hidden',
              background: LIGHT_BG,
              flexShrink: 0,
            }}
          >
            {displayLogo ? (
              <img
                src={displayLogo}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #1877F2 0%, #0052cc 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + sponsored */}
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, margin: 0, lineHeight: '20px', color: '#050505' }}>
              {displayName}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: GRAY_TEXT }}>Patrocinado</span>
              <span style={{ fontSize: 12, color: GRAY_TEXT }}>·</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill={GRAY_TEXT} aria-hidden="true">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zm3.5-8.26a7.2 7.2 0 0 0-.74-1.73A5.52 5.52 0 0 1 12.5 6.24zm-7 0A5.52 5.52 0 0 1 3.5 4.51a7.2 7.2 0 0 0-.74 1.73zM8 2.5c.6 0 1.44.92 1.95 2.5H6.05C6.56 3.42 7.4 2.5 8 2.5zM3.5 8c0-.44.06-.87.16-1.28h8.68c.1.41.16.84.16 1.28s-.06.87-.16 1.28H3.66A6.5 6.5 0 0 1 3.5 8zm2.55 4.74A5.52 5.52 0 0 1 3.5 9.76a7.2 7.2 0 0 0 .74 1.73zM8 13.5c-.6 0-1.44-.92-1.95-2.5h3.9C9.44 12.58 8.6 13.5 8 13.5zm2.26-.76a7.2 7.2 0 0 0 .74-1.73 5.52 5.52 0 0 1 2.5 1.73z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            type="button"
            aria-label="Mais opções"
            title="Mais opções"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: '50%',
              color: GRAY_TEXT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="12" cy="19" r="2" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Fechar anúncio"
            title="Fechar anúncio"
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: '50%',
              color: GRAY_TEXT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Ad body text */}
      {displayBody && (
        <div style={{ padding: '0 16px 10px', fontSize: 15, lineHeight: '20px', color: '#050505' }}>
          {displayBody}
        </div>
      )}

      {/* Creative image */}
      <div style={{ width: '100%', background: LIGHT_BG, overflow: 'hidden' }}>
        {displayImage ? (
          <img
            src={displayImage}
            alt="Imagem do anúncio"
            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '1.91/1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${LIGHT_BG} 0%, #d8dce4 100%)`,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aab0bc" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 3-3 4 4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Website link card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: '#F0F2F5',
          borderTop: `1px solid ${LIGHT_BG}`,
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontSize: 11,
              color: GRAY_TEXT,
              margin: '0 0 2px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {displayDomain}
          </p>
          <p
            style={{
              fontWeight: 700,
              fontSize: 15,
              margin: '0 0 1px',
              lineHeight: '20px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: '#050505',
            }}
          >
            {displayHeadline}
          </p>
          <p
            style={{
              fontSize: 13,
              color: GRAY_TEXT,
              margin: 0,
              lineHeight: '16px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {websiteUrl}
          </p>
        </div>
        <a
          href={websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: FB_BLUE,
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            textDecoration: 'none',
            display: 'inline-block',
            lineHeight: '18px',
          }}
        >
          {ctaText}
        </a>
      </div>

      {/* Reaction counter row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          borderBottom: `1px solid ${LIGHT_BG}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex' }}>
            {[
              { bg: FB_BLUE, icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="white" aria-hidden="true"><path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" /></svg> },
              { bg: '#F33E58', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="white" aria-hidden="true"><path d="M8 14.3l-1.2-1.1C3.2 10 1 8.1 1 5.7 1 3.5 2.7 2 5 2c1.2 0 2.4.6 3 1.5C8.6 2.6 9.8 2 11 2c2.3 0 4 1.5 4 3.7 0 2.4-2.2 4.3-5.8 7.5L8 14.3z" /></svg> },
            ].map((r, i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: r.bg,
                  border: '1.5px solid #fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: i > 0 ? -5 : 0,
                  position: 'relative',
                  zIndex: 2 - i,
                }}
              >
                {r.icon}
              </div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: GRAY_TEXT }}>{likes}</span>
        </div>
        <span style={{ fontSize: 13, color: GRAY_TEXT }}>{comments} comentários</span>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
        <button
          type="button"
          onClick={() => setLiked((p) => !p)}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: liked ? FB_BLUE : GRAY_TEXT,
            padding: '8px 4px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M4 8.5v9H1.5v-9H4zm13 1.5c0 .7-.4 1.3-.9 1.6.4.3.7.8.7 1.4 0 .5-.2 1-.6 1.3.3.3.5.7.5 1.2 0 .5-.2 1-.6 1.3.3.3.5.8.5 1.2 0 1-.8 1.5-1.8 1.5H9.5c-1 0-1.8-.8-1.8-1.8V9.5c0-.7.4-1.3 1-1.6C9 7.3 9.5 6.2 9.5 5c0-1 .8-1.5 1.8-1.5s1.8.8 1.8 1.5c0 1-.4 1.9-1.1 2.5H15c1 0 2 .9 2 2z" />
          </svg>
          Curtir
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: GRAY_TEXT,
            padding: '8px 4px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M10 2C5.6 2 2 5.2 2 9.2c0 2.3 1.2 4.4 3.2 5.7V18l2.9-1.6c1.2.3 2.5.5 3.9.5 4.4 0 8-3.2 8-7.2S14.4 2 10 2zm0 13c-1.1 0-2.2-.2-3.2-.6l-.4-.2-2 .8.6-2-.3-.5C3.5 11.3 2.8 9.9 2.8 8.4c0-3.1 3.2-5.6 7.2-5.6s7.2 2.5 7.2 5.6-3.2 5.6-7.2 5.6z" />
          </svg>
          Comentar
        </button>
        <button
          type="button"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: GRAY_TEXT,
            padding: '8px 4px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 4,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M16 12l-6-6v4c-5.5 0-8 3.5-9 8 2-2.5 5-3 9-3v4l6-6z" />
          </svg>
          Compartilhar
        </button>
      </div>
    </div>
  );
};
