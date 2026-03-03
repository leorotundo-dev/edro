'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitchClipProps {
  // Studio base props - identity
  name?: string;
  username?: string;
  brandName?: string;
  channelName?: string;
  // Studio base props - content
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  clipTitle?: string;
  // Studio base props - media
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Clip-specific
  duration?: string;
  viewCount?: number | string;
  gameName?: string;
  clipDate?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number | string | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const PlayIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const HeartIcon = ({ active }: { active: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={active ? '#F4212E' : 'none'} stroke={active ? '#F4212E' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitchClip: React.FC<TwitchClipProps> = ({
  name,
  username,
  brandName,
  channelName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  clipTitle,
  image,
  postImage,
  thumbnail,
  profileImage,
  duration = '0:42',
  viewCount = 8312,
  gameName = 'Valorant',
  clipDate = '2 dias atrás',
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(247);

  const displayChannel = channelName || name || username || brandName || 'StreamerBR';
  const displayTitle = clipTitle || headline || title || body || caption || description || text || 'Jogada INSANA que acabou com o round — você não vai acreditar!!';
  const mediaSrc = image || postImage || thumbnail || '';

  return (
    <div
      style={{
        width: 320,
        maxWidth: '100%',
        background: '#ffffff',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0e0e10', overflow: 'hidden', cursor: 'pointer' }}>
        {mediaSrc ? (
          <img
            src={mediaSrc}
            alt="Thumbnail do clipe"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #0e0e10 0%, #3d0070 100%)',
            }}
          />
        )}

        {/* "Clipe" badge */}
        <div
          style={{
            position: 'absolute', top: 8, left: 8,
            background: '#9147FF',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 7px',
            borderRadius: 20,
            textTransform: 'uppercase',
          }}
        >
          Clipe
        </div>

        {/* Duration badge */}
        <div
          style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(0,0,0,0.80)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {duration}
        </div>

        {/* Views overlay */}
        <div
          style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(0,0,0,0.72)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <EyeIcon />
          {formatCount(viewCount)}
        </div>

        {/* Play button */}
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Reproduzir clipe"
            style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'rgba(145, 71, 255, 0.85)',
              border: '2px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingLeft: 3,
            }}
          >
            <PlayIcon />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '12px 14px 14px' }}>
        {/* Clip title */}
        <p
          style={{
            margin: '0 0 10px',
            fontWeight: 700,
            fontSize: 14,
            lineHeight: '1.4',
            color: '#1a1a1a',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            wordBreak: 'break-word',
          }}
        >
          {displayTitle}
        </p>

        {/* Channel + game + date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: '#9147FF', overflow: 'hidden', flexShrink: 0,
            }}
          >
            {profileImage ? (
              <img src={profileImage} alt={displayChannel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #9147FF 0%, #5c2b9e 100%)' }} />
            )}
          </div>
          <span style={{ fontSize: 13, color: '#9147FF', fontWeight: 700, cursor: 'pointer' }}>{displayChannel}</span>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>·</span>
          <span style={{ fontSize: 13, color: '#6b7280' }}>{gameName}</span>
          <span style={{ color: '#9ca3af', fontSize: 13 }}>·</span>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{clipDate}</span>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            aria-label={liked ? 'Descurtir clipe' : 'Curtir clipe'}
            onClick={() => {
              setLiked((p) => !p);
              setLikeCount((c) => liked ? c - 1 : c + 1);
            }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: liked ? '#F4212E' : '#6b7280', fontSize: 13, padding: 0,
            }}
          >
            <HeartIcon active={liked} />
            {likeCount}
          </button>

          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#6b7280', fontSize: 13 }}>
            <EyeIcon />
            {formatCount(viewCount)} visualizações
          </span>

          <button
            type="button"
            aria-label="Compartilhar clipe"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 4,
              color: '#6b7280', fontSize: 13, padding: 0, marginLeft: 'auto',
            }}
          >
            <ShareIcon />
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};
