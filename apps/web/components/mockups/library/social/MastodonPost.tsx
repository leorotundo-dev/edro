'use client';

import React, { useState } from 'react';

interface MastodonPostProps {
  // Studio base aliases
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
  // Component-specific
  instance?: string;
  boostCount?: string | number;
  favoriteCount?: string | number;
  replyCount?: string | number;
  isVerified?: boolean;
  contentWarning?: string;
}

function formatCount(n: string | number | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Mastodon elephant logo SVG
const MastodonLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 74 79" fill="none">
    <path
      d="M73.7 17.5C72.6 10.1 65.4 4.2 57.1 3.1 55.7 2.9 50.4 2 37.7 2h-.1C25 2 22.3 2.9 20.9 3.1 12.8 4.2 5.2 9.5 3.6 17C2.8 21.1 2.7 25.6 3 29.7c.4 5.8.5 11.6 1.6 17.3 1.6 8.3 11.9 15.1 20 18.1 4.9 1.8 10.2 2.7 15.4 3-.4-2.2-.5-3.9-.5-3.9 0-1.8 1.3-2.2 2.6-1.9 0 0 5 1.2 9.1 2.2 4 .9 8.2-1 9.8-2.2 0 0 .4 2.5 1.3 5.4 6.3-1.2 12.6-3.6 17.6-7.5 6.9-5.3 10.1-13.1 10.7-21.1.2-2.1.3-4.5.3-7.1-.1-5.1-.7-10.3-.9-14.5z"
      fill="#6364FF"
    />
    <path
      d="M61.3 27.2v24.1H52V27.6c0-5-2.1-7.5-6.4-7.5-4.7 0-7.1 3-7.1 9v13h-9.2v-13c0-6-2.4-9-7.1-9-4.3 0-6.4 2.5-6.4 7.5v23.7h-9.3V27.2c0-5 1.3-9 3.8-11.9 2.6-2.9 6.1-4.4 10.5-4.4 5 0 8.8 1.9 11.3 5.7l2.4 4.1 2.4-4.1c2.5-3.8 6.3-5.7 11.3-5.7 4.4 0 7.9 1.5 10.5 4.4 2.5 2.9 3.6 6.9 3.6 11.9z"
      fill="white"
    />
  </svg>
);

// Globe (public) icon
const GlobeIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

// Render post text with hashtag/mention highlighting
function renderText(rawText: string, highlightColor: string) {
  return rawText
    .split(/((?:#|@)[\w\u00C0-\u017F.]+)/g)
    .map((part, i) =>
      part.startsWith('#') || part.startsWith('@') ? (
        <span key={i} style={{ color: highlightColor, fontWeight: 500 }}>
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
}

export const MastodonPost: React.FC<MastodonPostProps> = ({
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
  instance = 'mastodon.social',
  boostCount = 42,
  favoriteCount = 118,
  replyCount = 17,
  isVerified = true,
  contentWarning,
}) => {
  const [boosted, setBoosted] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [cwVisible, setCwVisible] = useState(!contentWarning);

  const displayName = name ?? brandName ?? 'Leandro Faria';
  const resolvedUsername = username ?? name ?? brandName ?? 'leandro';
  const atHandle = `@${resolvedUsername.replace('@', '')}@${instance}`;
  const postText =
    body ??
    caption ??
    text ??
    description ??
    headline ??
    title ??
    'O software livre não é apenas uma questão técnica — é uma questão de liberdade e autonomia digital. #FreeSoftware #Fediverse #TecnologiaLivre';
  const postImage_ = postImage ?? image ?? thumbnail ?? '';
  const avatarSrc = profileImage ?? image ?? '';

  const boosts = formatCount(typeof boostCount === 'number' ? boostCount + (boosted ? 1 : 0) : boostCount);
  const favorites = formatCount(typeof favoriteCount === 'number' ? favoriteCount + (favorited ? 1 : 0) : favoriteCount);
  const replies = formatCount(replyCount);

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 420,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        flexShrink: 0,
      }}
    >
      {/* ── Header: Mastodon branding ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '12px 16px 10px',
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <MastodonLogo size={22} />
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#1F2937',
            letterSpacing: '-0.01em',
          }}
        >
          Mastodon
        </span>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#9CA3AF',
            background: '#F3F4F6',
            borderRadius: 10,
            padding: '2px 8px',
          }}
        >
          {instance}
        </span>
      </div>

      {/* ── Post content ── */}
      <div style={{ padding: '14px 16px 0' }}>
        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          {/* Avatar with instance badge */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #6364FF 0%, #9A3FF4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                initials
              )}
            </div>
            {/* Instance favicon badge */}
            <div
              style={{
                position: 'absolute',
                bottom: -3,
                right: -3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#6364FF',
                border: '2px solid #fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="8" height="8" viewBox="0 0 74 79" fill="white">
                <path d="M37 10C20 10 6 22 6 37s14 27 31 27 31-12 31-27S54 10 37 10z" />
              </svg>
            </div>
          </div>

          {/* Author info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1F2937' }}>{displayName}</span>
              {isVerified && (
                <span
                  style={{
                    fontSize: 11,
                    color: '#6364FF',
                    fontWeight: 600,
                    background: '#EEF0FF',
                    borderRadius: 10,
                    padding: '1px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  ✓ verificado
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{atHandle}</span>
              <span style={{ color: '#D1D5DB', fontSize: 12 }}>·</span>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>3h</span>
              <span style={{ marginLeft: 2 }}>
                <GlobeIcon />
              </span>
            </div>
          </div>

          {/* Meatball menu */}
          <button
            type="button"
            aria-label="Mais opções"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              padding: 4,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Content Warning toggle */}
        {contentWarning && (
          <div
            style={{
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span style={{ fontSize: 13, color: '#92400E', fontWeight: 500 }}>{contentWarning}</span>
            </div>
            <button
              type="button"
              aria-label={cwVisible ? 'Ocultar conteúdo' : 'Mostrar conteúdo'}
              onClick={() => setCwVisible((v) => !v)}
              style={{
                background: '#D97706',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cwVisible ? 'Ocultar' : 'Mostrar conteúdo'}
            </button>
          </div>
        )}

        {/* Post text */}
        {cwVisible && (
          <>
            <p
              style={{
                fontSize: 14.5,
                lineHeight: '1.6',
                color: '#1F2937',
                margin: '0 0 12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {renderText(postText, '#6364FF')}
            </p>

            {/* Post image */}
            {postImage_ && (
              <div
                style={{
                  borderRadius: 10,
                  overflow: 'hidden',
                  marginBottom: 14,
                  border: '1px solid #E5E7EB',
                }}
              >
                <img
                  src={postImage_}
                  alt="Imagem do post"
                  style={{ display: 'block', width: '100%', maxHeight: 240, objectFit: 'cover' }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Action bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px 14px',
          gap: 4,
        }}
      >
        {/* Reply */}
        <button
          type="button"
          aria-label="Responder"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            color: '#9CA3AF',
            fontSize: 13,
            padding: '6px 4px',
            borderRadius: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span>{replies}</span>
        </button>

        {/* Boost */}
        <button
          type="button"
          aria-label={boosted ? 'Cancelar boost' : 'Boost'}
          onClick={() => setBoosted((b) => !b)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            color: boosted ? '#22C55E' : '#9CA3AF',
            fontSize: 13,
            fontWeight: boosted ? 700 : 400,
            padding: '6px 4px',
            borderRadius: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 014-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 01-4 4H3" />
          </svg>
          <span>{boosts}</span>
        </button>

        {/* Favorite */}
        <button
          type="button"
          aria-label={favorited ? 'Remover favorito' : 'Favoritar'}
          onClick={() => setFavorited((f) => !f)}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            color: favorited ? '#F59E0B' : '#9CA3AF',
            fontSize: 13,
            fontWeight: favorited ? 700 : 400,
            padding: '6px 4px',
            borderRadius: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={favorited ? '#F59E0B' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span>{favorites}</span>
        </button>

        {/* Bookmark */}
        <button
          type="button"
          aria-label={bookmarked ? 'Remover marcador' : 'Marcar'}
          onClick={() => setBookmarked((b) => !b)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: bookmarked ? '#6364FF' : '#9CA3AF',
            padding: '6px 8px',
            borderRadius: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill={bookmarked ? '#6364FF' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
          </svg>
        </button>

        {/* Share */}
        <button
          type="button"
          aria-label="Compartilhar"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9CA3AF',
            padding: '6px 8px',
            borderRadius: 6,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
};
