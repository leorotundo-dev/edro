'use client';

import React, { useState } from 'react';

interface YouTubeCommunityProps {
  // Channel name
  channelName?: string;
  name?: string;
  username?: string;
  brandName?: string;
  // Channel avatar
  channelImage?: string;
  profileImage?: string;
  thumbnail?: string;
  // Post text / body
  postText?: string;
  text?: string;
  caption?: string;
  description?: string;
  body?: string;
  headline?: string;
  // Post image
  postImage?: string;
  image?: string;
  // Counts
  likeCount?: number | string;
  likes?: number | string;
  dislikeCount?: number | string;
  dislikes?: number | string;
  commentCount?: number | string;
  comments?: number | string;
  // Time
  timeAgo?: string;
  publishedAt?: string;
  timeLabel?: string;
  // Verified
  isVerified?: boolean;
}

function formatCount(n: number | string | undefined): string {
  if (!n && n !== 0) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#AAAAAA" style={{ flexShrink: 0 }}>
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

const ThumbUpIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? '#0F0F0F' : 'none'}
    stroke={filled ? '#0F0F0F' : '#606060'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbDownIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill={filled ? '#0F0F0F' : 'none'}
    stroke={filled ? '#0F0F0F' : '#606060'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

const CommentIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#606060"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#606060"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const ThreeDots = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#606060">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

const TEXT_COLLAPSE_LIMIT = 200;

export const YouTubeCommunity: React.FC<YouTubeCommunityProps> = ({
  channelName,
  name,
  username,
  brandName,
  channelImage,
  profileImage,
  thumbnail,
  postText,
  text,
  caption,
  description,
  body,
  headline,
  postImage,
  image,
  likeCount,
  likes,
  dislikeCount,
  dislikes,
  commentCount,
  comments,
  timeAgo,
  publishedAt,
  timeLabel,
  isVerified = false,
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayName = channelName || name || brandName || username || 'Canal';
  const displayAvatar = channelImage || profileImage || thumbnail || '';
  const displayText =
    postText || text || caption || description || body || headline ||
    'Publicação da comunidade do canal.';
  const displayImage = postImage || image || '';
  const displayTime = timeAgo || publishedAt || timeLabel || '1 dia atrás';

  const rawLikes = likeCount ?? likes ?? 2400;
  const rawDislikes = dislikeCount ?? dislikes;
  const rawComments = commentCount ?? comments ?? 156;

  const likesDisplay = formatCount(
    liked && typeof rawLikes === 'number' ? rawLikes + 1 : rawLikes,
  );

  const handleLike = () => {
    setLiked((p) => !p);
    if (disliked) setDisliked(false);
  };
  const handleDislike = () => {
    setDisliked((p) => !p);
    if (liked) setLiked(false);
  };

  const isLong = displayText.length > TEXT_COLLAPSE_LIMIT;
  const shownText =
    isLong && !expanded ? displayText.slice(0, TEXT_COLLAPSE_LIMIT) + '...' : displayText;

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid #E5E5E5',
        padding: '14px 16px 10px',
        fontFamily: '"Roboto", Arial, sans-serif',
        color: '#0F0F0F',
      }}
    >
      {/* ── Header: avatar + name + time + three-dot ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 10,
        }}
      >
        {/* Avatar — 40px */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#FF0000',
            flexShrink: 0,
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Name + verified + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: '#0F0F0F',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 200,
              }}
            >
              {displayName}
            </span>
            {isVerified && <VerifiedBadge />}
            <span style={{ color: '#AAAAAA', fontSize: 13 }}>·</span>
            <span style={{ fontSize: 13, color: '#606060' }}>{displayTime}</span>
          </div>
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
            lineHeight: 0,
          }}
        >
          <ThreeDots />
        </button>
      </div>

      {/* ── Post text body ── */}
      <div style={{ marginBottom: displayImage ? 10 : 12 }}>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: '#0F0F0F',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {shownText}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0 0',
              fontSize: 13,
              fontWeight: 700,
              color: '#065FD4',
              fontFamily: 'inherit',
            }}
          >
            {expanded ? 'Mostrar menos' : 'Saiba mais'}
          </button>
        )}
      </div>

      {/* ── Optional post image ── */}
      {displayImage && (
        <div
          style={{
            borderRadius: 10,
            overflow: 'hidden',
            marginBottom: 10,
            background: '#F2F2F2',
          }}
        >
          <img
            src={displayImage}
            alt="Imagem da publicação"
            style={{ width: '100%', display: 'block', objectFit: 'cover' }}
          />
        </div>
      )}

      {/* ── Reaction bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          paddingTop: 4,
          borderTop: '1px solid #F2F2F2',
          marginTop: 2,
        }}
      >
        {/* Like */}
        <button
          type="button"
          aria-label="Curtir"
          onClick={handleLike}
          style={{
            background: liked ? '#F2F2F2' : 'none',
            border: 'none',
            borderRadius: 20,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: liked ? '#0F0F0F' : '#606060',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            transition: 'background 0.12s',
          }}
        >
          <ThumbUpIcon filled={liked} />
          {likesDisplay}
        </button>

        {/* Dislike */}
        <button
          type="button"
          aria-label="Não curti"
          onClick={handleDislike}
          style={{
            background: disliked ? '#F2F2F2' : 'none',
            border: 'none',
            borderRadius: 20,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: disliked ? '#0F0F0F' : '#606060',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            transition: 'background 0.12s',
          }}
        >
          <ThumbDownIcon filled={disliked} />
          {rawDislikes !== undefined ? formatCount(rawDislikes) : null}
        </button>

        {/* Comments */}
        <button
          type="button"
          aria-label="Comentários"
          style={{
            background: 'none',
            border: 'none',
            borderRadius: 20,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#606060',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CommentIcon />
          {formatCount(rawComments)}
        </button>

        {/* Share */}
        <button
          type="button"
          aria-label="Compartilhar"
          style={{
            background: 'none',
            border: 'none',
            borderRadius: 20,
            padding: '6px 10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#606060',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <ShareIcon />
          Compartilhar
        </button>
      </div>
    </div>
  );
};
