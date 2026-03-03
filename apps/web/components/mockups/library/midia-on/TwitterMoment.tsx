'use client';

import React, { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface TwitterMomentProps {
  // Cover image aliases
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Title aliases
  title?: string;
  headline?: string;
  name?: string;
  momentTitle?: string;
  // Description aliases
  description?: string;
  body?: string;
  caption?: string;
  text?: string;
  // Curator identity aliases
  curatorName?: string;
  brandName?: string;
  username?: string;
  // Curator handle
  curatorHandle?: string;
  handle?: string;
  // Meta
  tweetCount?: number;
  category?: string;
  timeLabel?: string;
  timeAgo?: string;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const XLogo = ({ size = 18, color = '#000' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ChevronRightIcon = ({ size = 16, color = '#fff' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// ─── Component ─────────────────────────────────────────────────────────────

export const TwitterMoment: React.FC<TwitterMomentProps> = ({
  image,
  postImage,
  thumbnail,
  title,
  headline,
  name,
  momentTitle,
  description,
  body,
  caption,
  text,
  curatorName,
  brandName,
  username,
  curatorHandle,
  handle,
  tweetCount = 47,
  category = 'Tendência',
  timeLabel,
  timeAgo,
}) => {
  const [hovered, setHovered] = useState(false);

  const displayImage = image || postImage || thumbnail || '';
  const displayTitle = momentTitle || title || headline || name || 'Momento Destaque';
  const displayDescription =
    description || body || caption || text ||
    'Uma coleção dos melhores tweets sobre este assunto em destaque.';
  const displayCurator = curatorName || brandName || username || 'Curador';
  const rawHandle = curatorHandle || handle || 'curador';
  const displayHandle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
  const displayTime = timeLabel || timeAgo || '3h';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 360,
        background: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #EFF3F4',
        boxShadow: hovered
          ? '0 4px 20px rgba(0,0,0,0.14)'
          : '0 1px 6px rgba(0,0,0,0.08)',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0F1419',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s ease',
        userSelect: 'none',
      }}
    >
      {/* ── Top label row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px 8px',
          borderBottom: '1px solid #EFF3F4',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#71767B',
          }}
        >
          Momento X
        </span>
        <XLogo size={17} color="#000" />
      </div>

      {/* ── Cover image ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9
          background: displayImage ? '#1a1a1a' : 'linear-gradient(135deg, #1D9BF0 0%, #0d5e9a 100%)',
          overflow: 'hidden',
        }}
      >
        {displayImage && (
          <img
            src={displayImage}
            alt={displayTitle}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Category pill */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            background: 'rgba(29,155,240,0.92)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 20,
            padding: '3px 9px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {category}
        </div>

        {/* Overlay title */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 14px',
          }}
        >
          <h3
            style={{
              margin: '0 0 4px',
              fontSize: 18,
              fontWeight: 800,
              color: '#fff',
              lineHeight: 1.3,
              textShadow: '0 1px 4px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {displayTitle}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'rgba(255,255,255,0.82)',
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {displayDescription}
          </p>
        </div>
      </div>

      {/* ── Meta row ── */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid #EFF3F4',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        {/* Curator avatar placeholder */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #1D9BF0, #0d5e9a)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
            {displayCurator.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Curator name + handle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0F1419',
                whiteSpace: 'nowrap',
              }}
            >
              {displayCurator}
            </span>
            <span style={{ fontSize: 13, color: '#71767B', whiteSpace: 'nowrap' }}>
              {displayHandle}
            </span>
            <span style={{ color: '#71767B', fontSize: 13 }}>·</span>
            <span style={{ fontSize: 13, color: '#71767B', whiteSpace: 'nowrap' }}>
              {displayTime}
            </span>
          </div>
        </div>

        {/* Tweet count */}
        <span
          style={{
            fontSize: 12,
            color: '#71767B',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          {tweetCount} tweets
        </span>
      </div>

      {/* ── CTA button ── */}
      <div style={{ padding: '12px 14px' }}>
        <button
          type="button"
          style={{
            width: '100%',
            background: '#1D9BF0',
            color: '#fff',
            border: 'none',
            borderRadius: 20,
            padding: '10px 16px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            letterSpacing: '0.01em',
          }}
        >
          Explorar momento
          <ChevronRightIcon size={15} color="#fff" />
        </button>
      </div>
    </div>
  );
};
