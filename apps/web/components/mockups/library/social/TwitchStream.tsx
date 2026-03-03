'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitchStreamProps {
  // Studio base props - identity
  name?: string;
  username?: string;
  brandName?: string;
  // Studio base props - content
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  // Studio base props - media
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Stream-specific
  streamTitle?: string;
  viewerCount?: number | string;
  gameName?: string;
  uptime?: string;
  tags?: string[];
  isPartner?: boolean;
  isLive?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatViewers(n: number | string | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const TwitchLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#9147FF" aria-hidden="true">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z" />
  </svg>
);

const EyeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const PlayIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const CheckBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#9147FF" aria-hidden="true">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
  </svg>
);

// ─── Tag colors (cycle through these) ────────────────────────────────────────

const TAG_COLORS = [
  { bg: '#f0e6ff', color: '#6b21a8' },
  { bg: '#e0f2fe', color: '#075985' },
  { bg: '#dcfce7', color: '#166534' },
  { bg: '#fef9c3', color: '#854d0e' },
  { bg: '#ffe4e6', color: '#9f1239' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitchStream: React.FC<TwitchStreamProps> = ({
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
  streamTitle,
  viewerCount = 12743,
  gameName = 'Valorant',
  uptime = '3h 24m',
  tags = ['português', 'fps', 'pvp', 'competitivo'],
  isPartner = true,
  isLive = true,
}) => {
  const [following, setFollowing] = useState(false);

  const displayName = name || username || brandName || 'StreamerBR';
  const displayStreamTitle = streamTitle || headline || title || body || caption || description || text || 'Ranked grindando até Radiante — !discord !setup';
  const mediaSrc = image || postImage || thumbnail || '';

  return (
    <div
      style={{
        width: 360,
        maxWidth: '100%',
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Thumbnail ── */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0e0e10', overflow: 'hidden' }}>
        {mediaSrc ? (
          <img
            src={mediaSrc}
            alt="Thumbnail da live"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #1a0033 0%, #3d0070 50%, #6b21a8 100%)',
            }}
          />
        )}

        {/* Live badge */}
        {isLive && (
          <div
            style={{
              position: 'absolute', top: 8, left: 8,
              background: '#eb0400',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            AO VIVO
          </div>
        )}

        {/* Viewer count */}
        <div
          style={{
            position: 'absolute', bottom: 8, left: 8,
            background: 'rgba(0,0,0,0.72)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            padding: '2px 7px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <EyeIcon />
          {formatViewers(viewerCount)} espectadores
        </div>

        {/* Play button overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            aria-label="Reproduzir stream"
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(145, 71, 255, 0.88)',
              border: '3px solid rgba(255,255,255,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: 4,
            }}
          >
            <PlayIcon />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '12px 14px 14px' }}>
        {/* Stream title */}
        <p
          style={{
            margin: '0 0 4px',
            fontWeight: 700,
            fontSize: 15,
            lineHeight: '1.35',
            color: '#1a1a1a',
            wordBreak: 'break-word',
          }}
        >
          {displayStreamTitle}
        </p>

        {/* Game tag */}
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#9147FF', fontWeight: 600, cursor: 'pointer' }}>
          {gameName}
        </p>

        {/* Streamer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {/* Avatar */}
          <div
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: '#9147FF',
              overflow: 'hidden', flexShrink: 0,
              border: '2px solid #9147FF',
            }}
          >
            {profileImage ? (
              <img src={profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #9147FF 0%, #5c2b9e 100%)' }} />
            )}
          </div>

          {/* Name + badge */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {displayName}
              </span>
              {isPartner && <CheckBadge />}
            </div>
          </div>

          {/* Follow button */}
          <button
            type="button"
            aria-label={following ? 'Deixar de seguir' : 'Seguir canal'}
            onClick={() => setFollowing((p) => !p)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              border: following ? '2px solid #9147FF' : 'none',
              background: following ? 'transparent' : '#9147FF',
              color: following ? '#9147FF' : '#ffffff',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {following ? 'Seguindo' : 'Seguir'}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10, color: '#6b7280', fontSize: 13 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <EyeIcon />
            {formatViewers(viewerCount)} espectadores
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ClockIcon />
            {uptime}
          </span>
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((tag, i) => (
            <span
              key={tag}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 20,
                background: TAG_COLORS[i % TAG_COLORS.length].bg,
                color: TAG_COLORS[i % TAG_COLORS.length].color,
                cursor: 'pointer',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Footer brand ── */}
      <div style={{ borderTop: '1px solid #f3f4f6', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <TwitchLogo />
        <span style={{ fontSize: 12, color: '#9147FF', fontWeight: 600 }}>twitch.tv/{displayName.toLowerCase().replace(/\s+/g, '')}</span>
      </div>
    </div>
  );
};
