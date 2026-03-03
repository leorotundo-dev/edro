'use client';

import React, { useState } from 'react';

interface YouTubeShortsProps {
  // Media
  thumbnail?: string;
  image?: string;
  storyImage?: string;
  postImage?: string;
  // Title / caption
  title?: string;
  headline?: string;
  caption?: string;
  description?: string;
  text?: string;
  body?: string;
  // Channel
  channelName?: string;
  name?: string;
  username?: string;
  brandName?: string;
  // Channel avatar
  channelImage?: string;
  profileImage?: string;
  // Counts
  likeCount?: string | number;
  likes?: string | number;
  dislikeCount?: string | number;
  commentCount?: string | number;
  comments?: string | number;
  shareCount?: string | number;
  views?: string | number;
  // Audio
  audioTitle?: string;
  soundName?: string;
}

function formatCount(n: string | number | undefined): string {
  if (!n && n !== 0) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

// YouTube Shorts logo (play icon + "Shorts" wordmark)
const ShortsLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
        fill="#FF0000"
      />
    </svg>
    <span
      style={{
        color: '#fff',
        fontSize: 16,
        fontWeight: 700,
        letterSpacing: '-0.3px',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      Shorts
    </span>
  </div>
);

const ThumbUpIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? '#fff' : 'none'}
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbDownIcon = ({ filled }: { filled: boolean }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill={filled ? '#fff' : 'none'}
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

const CommentIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const RemixIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const actionBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  cursor: 'pointer',
  borderRadius: 40,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  color: '#fff',
  fontFamily: 'inherit',
};

export const YouTubeShorts: React.FC<YouTubeShortsProps> = ({
  thumbnail,
  image,
  storyImage,
  postImage,
  title,
  headline,
  caption,
  description,
  text,
  body,
  channelName,
  name,
  username,
  brandName,
  channelImage,
  profileImage,
  likeCount,
  likes,
  dislikeCount,
  commentCount,
  comments,
  shareCount,
  audioTitle,
  soundName,
}) => {
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);

  const media = thumbnail || storyImage || image || postImage || '';
  const displayTitle = title || headline || caption || description || text || body || '';
  const displayChannel = channelName || name || brandName || username || '@canal';
  const displayAvatar = channelImage || profileImage || '';
  const normalizedChannel = displayChannel.startsWith('@')
    ? displayChannel
    : `@${displayChannel}`;

  const rawLikes = likeCount ?? likes ?? '24,5mil';
  const rawComments = commentCount ?? comments ?? '1,2mil';
  const rawShare = shareCount ?? '843';

  const likesDisplay = formatCount(
    liked && typeof rawLikes === 'number' ? rawLikes + 1 : rawLikes,
  );
  const sound = audioTitle || soundName || `Som original · ${normalizedChannel}`;

  const handleLike = () => {
    setLiked((p) => !p);
    if (disliked) setDisliked(false);
  };
  const handleDislike = () => {
    setDisliked((p) => !p);
    if (liked) setLiked(false);
  };

  return (
    <>
      {/* Keyframe animation injected via <style> tag — className allowed for CSS animations */}
      <style>{`
        @keyframes ytShortsDiscSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .yt-shorts-disc {
          animation: ytShortsDiscSpin 4s linear infinite;
        }
      `}</style>

      <div
        style={{
          position: 'relative',
          width: 360,
          height: 640,
          background: '#000',
          borderRadius: 16,
          overflow: 'hidden',
          fontFamily: '"Roboto", Arial, sans-serif',
          color: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55)',
        }}
      >
        {/* Background media */}
        {media ? (
          <img
            src={media}
            alt="Short"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            }}
          />
        )}

        {/* Bottom gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.25) 40%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top bar: Shorts logo + Close X */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '14px 14px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
          }}
        >
          <ShortsLogo />
          <button
            type="button"
            aria-label="Fechar"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              lineHeight: 0,
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Right sidebar actions */}
        <div
          style={{
            position: 'absolute',
            right: 8,
            bottom: 90,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            zIndex: 10,
          }}
        >
          {/* Channel avatar + subscribe dot */}
          <div style={{ position: 'relative', marginBottom: 6 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid white',
                background: '#333',
              }}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={normalizedChannel}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
                  }}
                />
              )}
            </div>
            {/* Red subscribe plus */}
            <div
              style={{
                position: 'absolute',
                bottom: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#FF0000',
                border: '2px solid #000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line
                  x1="5"
                  y1="1"
                  x2="5"
                  y2="9"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="1"
                  y1="5"
                  x2="9"
                  y2="5"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Like */}
          <button
            type="button"
            aria-label="Curtir"
            onClick={handleLike}
            style={{
              ...actionBtnStyle,
              background: liked
                ? 'rgba(255,255,255,0.3)'
                : 'rgba(255,255,255,0.15)',
            }}
          >
            <ThumbUpIcon filled={liked} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>{likesDisplay}</span>
          </button>

          {/* Dislike */}
          <button
            type="button"
            aria-label="Não curti"
            onClick={handleDislike}
            style={{
              ...actionBtnStyle,
              background: disliked
                ? 'rgba(255,255,255,0.3)'
                : 'rgba(255,255,255,0.15)',
            }}
          >
            <ThumbDownIcon filled={disliked} />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Não curti</span>
          </button>

          {/* Comments */}
          <button
            type="button"
            aria-label="Comentários"
            style={actionBtnStyle}
          >
            <CommentIcon />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {formatCount(rawComments)}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            aria-label="Compartilhar"
            style={actionBtnStyle}
          >
            <ShareIcon />
            <span style={{ fontSize: 11, fontWeight: 600 }}>
              {formatCount(rawShare)}
            </span>
          </button>

          {/* Remix */}
          <button
            type="button"
            aria-label="Remixar"
            style={actionBtnStyle}
          >
            <RemixIcon />
            <span style={{ fontSize: 11, fontWeight: 600 }}>Remixar</span>
          </button>
        </div>

        {/* Bottom-left: username + description */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            right: 72,
            bottom: 50,
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 14,
              display: 'block',
              marginBottom: 4,
              textShadow: '0 1px 4px rgba(0,0,0,0.6)',
            }}
          >
            {normalizedChannel}
          </span>
          {displayTitle && (
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.45,
                margin: '0 0 8px',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {displayTitle}
            </p>
          )}

          {/* Audio bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Spinning disc — className used only for CSS animation */}
            <div
              className="yt-shorts-disc"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background:
                  'radial-gradient(circle at 40% 40%, #555 0%, #222 60%, #111 100%)',
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <MusicNoteIcon />
            </div>
            <span
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.88)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {sound}
            </span>
          </div>
        </div>

        {/* Bottom progress bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'rgba(255,255,255,0.25)',
          }}
        >
          <div
            style={{
              width: '35%',
              height: '100%',
              background: '#FF0000',
            }}
          />
        </div>
      </div>
    </>
  );
};
