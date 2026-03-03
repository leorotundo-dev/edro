'use client';

import React, { useState } from 'react';

interface YouTubeThumbnailProps {
  // Thumbnail / image
  thumbnail?: string;
  image?: string;
  postImage?: string;
  // Video title
  title?: string;
  headline?: string;
  name?: string;
  // Duration badge
  duration?: string;
  // View count
  viewCount?: string | number;
  views?: string | number;
  // Channel
  channelName?: string;
  brandName?: string;
  username?: string;
  // Channel avatar
  channelImage?: string;
  profileImage?: string;
  // Time since publish
  timeAgo?: string;
  publishedAt?: string;
  timeLabel?: string;
}

function formatViews(v: string | number | undefined): string {
  if (!v && v !== 0) return '';
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mi de visualizações`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}mil visualizações`;
  return `${v} visualizações`;
}

const ThreeDots = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#606060">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

const WatchLaterIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
    <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="#AAAAAA" style={{ flexShrink: 0 }}>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

export const YouTubeThumbnail: React.FC<YouTubeThumbnailProps> = ({
  thumbnail,
  image,
  postImage,
  title,
  headline,
  name,
  duration = '12:34',
  viewCount,
  views,
  channelName,
  brandName,
  username,
  channelImage,
  profileImage,
  timeAgo,
  publishedAt,
  timeLabel,
}) => {
  const [hovered, setHovered] = useState(false);
  const [watchLaterVisible, setWatchLaterVisible] = useState(false);

  const displayThumbnail = thumbnail || image || postImage || '';
  const displayTitle = title || headline || name || 'Título do vídeo';
  const displayViews = formatViews(viewCount ?? views);
  const displayChannel = channelName || brandName || username || 'Canal';
  const displayAvatar = channelImage || profileImage || '';
  const displayTime = timeAgo || publishedAt || timeLabel || 'há 3 dias';

  return (
    <div
      style={{
        width: 320,
        background: '#fff',
        fontFamily: '"Roboto", Arial, sans-serif',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail image — 16:9 ratio */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          background: '#0f0f0f',
          overflow: 'hidden',
        }}
        onMouseEnter={() => setWatchLaterVisible(true)}
        onMouseLeave={() => setWatchLaterVisible(false)}
      >
        {displayThumbnail ? (
          <img
            src={displayThumbnail}
            alt={displayTitle}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.2s ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        )}

        {/* Duration badge — bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            right: 6,
            background: 'rgba(0,0,0,0.88)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 3,
            letterSpacing: '0.02em',
          }}
        >
          {duration}
        </div>

        {/* Watch Later button — top-right, shown on hover */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            background: 'rgba(0,0,0,0.75)',
            borderRadius: 4,
            padding: '5px 7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: watchLaterVisible ? 1 : 0,
            transition: 'opacity 0.15s ease',
            cursor: 'pointer',
          }}
          title="Assistir mais tarde"
        >
          <WatchLaterIcon />
        </div>
      </div>

      {/* Metadata row */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          padding: '10px 0 8px',
          alignItems: 'flex-start',
        }}
      >
        {/* Channel avatar — 32px */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#FF0000',
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayChannel}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Title + channel + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Video title — max 2 lines */}
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 14,
              fontWeight: 600,
              color: '#0f0f0f',
              lineHeight: 1.4,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayTitle}
          </p>

          {/* Channel name + verified */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 12,
                color: '#606060',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayChannel}
            </span>
            <VerifiedBadge />
          </div>

          {/* Views + time */}
          <p style={{ margin: 0, fontSize: 12, color: '#606060' }}>
            {[displayViews, displayTime].filter(Boolean).join(' • ')}
          </p>
        </div>

        {/* Three-dot menu */}
        <button
          type="button"
          aria-label="Mais opções"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 4px',
            flexShrink: 0,
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.15s',
            alignSelf: 'flex-start',
          }}
        >
          <ThreeDots />
        </button>
      </div>
    </div>
  );
};
