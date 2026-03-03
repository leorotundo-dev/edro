'use client';

import React, { useState } from 'react';

interface YouTubeVideoProps {
  // Thumbnail
  thumbnail?: string;
  image?: string;
  postImage?: string;
  // Title
  title?: string;
  headline?: string;
  name?: string;
  // Channel name
  channelName?: string;
  brandName?: string;
  username?: string;
  // Channel avatar
  channelAvatar?: string;
  channelImage?: string;
  profileImage?: string;
  // Counts
  viewCount?: string | number;
  views?: string | number;
  likeCount?: string | number;
  likes?: string | number;
  subscriberCount?: string | number;
  subscribers?: string;
  // Description
  description?: string;
  body?: string;
  caption?: string;
  text?: string;
  // Meta
  publishedAt?: string;
  timeLabel?: string;
  timeAgo?: string;
  // Duration
  duration?: string;
}

interface SuggestedVideo {
  thumbnail?: string;
  title: string;
  channel: string;
  views: string;
  duration: string;
}

function formatViews(v: string | number | undefined): string {
  if (!v && v !== 0) return '0 visualizações';
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mi de visualizações`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}mil visualizações`;
  return `${v} visualizações`;
}

function formatSubs(s: string | number | undefined): string {
  if (!s && s !== 0) return '0 inscritos';
  if (typeof s === 'string') return s;
  if (s >= 1_000_000) return `${(s / 1_000_000).toFixed(1)}M de inscritos`;
  if (s >= 1_000) return `${(s / 1_000).toFixed(1)}mil inscritos`;
  return `${s} inscritos`;
}

function formatLikes(n: string | number | undefined): string {
  if (!n && n !== 0) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

const ThumbUpIcon = ({ filled, color }: { filled?: boolean; color?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? (color ?? '#0f0f0f') : 'none'}
    stroke={color ?? '#0f0f0f'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const ThumbDownIcon = ({ filled, color }: { filled?: boolean; color?: string }) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill={filled ? (color ?? '#0f0f0f') : 'none'}
    stroke={color ?? '#0f0f0f'}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

const ShareArrowIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#0f0f0f"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="#AAAAAA" style={{ flexShrink: 0 }}>
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

const ThreeDots = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#606060">
    <circle cx="12" cy="5" r="1.8" />
    <circle cx="12" cy="12" r="1.8" />
    <circle cx="12" cy="19" r="1.8" />
  </svg>
);

const SUGGESTED: SuggestedVideo[] = [
  {
    title: 'Como melhorar sua produtividade em 2025',
    channel: 'Produtividade BR',
    views: '1,2 mi de visualizações',
    duration: '8:14',
  },
  {
    title: 'Os segredos do marketing digital revelados',
    channel: 'Marketing Total',
    views: '843mil visualizações',
    duration: '12:07',
  },
  {
    title: 'Tutorial completo de edição de vídeo',
    channel: 'CriaTV',
    views: '2,1 mi de visualizações',
    duration: '24:33',
  },
];

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  thumbnail,
  image,
  postImage,
  title,
  headline,
  name,
  channelName,
  brandName,
  username,
  channelAvatar,
  channelImage,
  profileImage,
  viewCount,
  views,
  likeCount,
  likes,
  subscriberCount,
  subscribers,
  description,
  body,
  caption,
  text,
  publishedAt,
  timeLabel,
  timeAgo,
  duration = '4:32',
}) => {
  const [subscribed, setSubscribed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);

  const displayThumbnail = thumbnail || image || postImage || '';
  const displayTitle = title || headline || name || 'Título do Vídeo';
  const displayChannel = channelName || brandName || username || 'Canal';
  const displayAvatar = channelAvatar || channelImage || profileImage || '';
  const displayViews = formatViews(viewCount ?? views);
  const displaySubs = subscribers || formatSubs(subscriberCount);
  const displayTime = timeAgo || publishedAt || timeLabel || 'há 2 dias';
  const displayDesc =
    description || body || caption || text ||
    'Este vídeo aborda os principais tópicos do assunto de forma detalhada e didática. Confira os links na descrição e não esqueça de se inscrever no canal para mais conteúdo como este.';

  const rawLikes = likeCount ?? likes ?? 4800;
  const likesLabel = formatLikes(
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

  const descShort = displayDesc.length > 120 && !descExpanded
    ? displayDesc.slice(0, 120) + '...'
    : displayDesc;

  return (
    <div
      style={{
        width: 420,
        background: '#fff',
        fontFamily: '"Roboto", Arial, sans-serif',
        color: '#0f0f0f',
      }}
    >
      {/* ── Video thumbnail / player ── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%',
          background: '#000',
          cursor: 'pointer',
        }}
        onClick={() => setPlaying((p) => !p)}
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
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #2a2a2a 100%)',
            }}
          />
        )}

        {/* Play button overlay */}
        {!playing && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.2)',
            }}
          >
            <div
              style={{
                width: 64,
                height: 44,
                background: 'rgba(255,0,0,0.92)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Duration badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(0,0,0,0.88)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 3,
          }}
        >
          {duration}
        </div>
      </div>

      {/* ── Title ── */}
      <div style={{ padding: '10px 12px 0' }}>
        <h2
          style={{
            margin: '0 0 6px',
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.4,
            color: '#0f0f0f',
          }}
        >
          {displayTitle}
        </h2>

        {/* Views + date */}
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#606060' }}>
          {displayViews} · {displayTime}
        </p>

        {/* ── Like / Dislike pill + Share ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          {/* Like + Dislike combined pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#F2F2F2',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {/* Like side */}
            <button
              type="button"
              aria-label="Curtir"
              onClick={handleLike}
              style={{
                background: liked ? '#E8E8E8' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
                color: '#0f0f0f',
                borderRight: '1px solid #D9D9D9',
              }}
            >
              <ThumbUpIcon filled={liked} />
              {likesLabel}
            </button>

            {/* Dislike side */}
            <button
              type="button"
              aria-label="Não curti"
              onClick={handleDislike}
              style={{
                background: disliked ? '#E8E8E8' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px 12px',
                fontFamily: 'inherit',
              }}
            >
              <ThumbDownIcon filled={disliked} />
            </button>
          </div>

          {/* Share */}
          <button
            type="button"
            style={{
              background: '#F2F2F2',
              border: 'none',
              borderRadius: 20,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              color: '#0f0f0f',
            }}
          >
            <ShareArrowIcon />
            Compartilhar
          </button>
        </div>

        {/* ── Channel row ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 0',
            borderTop: '1px solid #E5E5E5',
            borderBottom: '1px solid #E5E5E5',
            marginBottom: 10,
          }}
        >
          {/* Channel avatar */}
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + subs */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#0f0f0f',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {displayChannel}
              </span>
              <VerifiedBadge />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#606060' }}>{displaySubs}</p>
          </div>

          {/* Subscribe */}
          <button
            type="button"
            onClick={() => setSubscribed((p) => !p)}
            style={{
              flexShrink: 0,
              background: subscribed ? '#F2F2F2' : '#FF0000',
              color: subscribed ? '#0f0f0f' : '#fff',
              border: 'none',
              borderRadius: 20,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {subscribed ? 'Inscrito' : 'Inscrever-se'}
          </button>
        </div>

        {/* ── Description accordion ── */}
        <div
          style={{
            background: '#F9F9F9',
            borderRadius: 10,
            padding: '10px 12px',
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.55,
            color: '#0f0f0f',
          }}
        >
          <p style={{ margin: '0 0 4px' }}>{descShort}</p>
          {displayDesc.length > 120 && (
            <button
              type="button"
              onClick={() => setDescExpanded((p) => !p)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: 13,
                fontWeight: 700,
                color: '#0f0f0f',
                fontFamily: 'inherit',
              }}
            >
              {descExpanded ? 'Mostrar menos' : 'Mostrar mais'}
            </button>
          )}
        </div>

        {/* ── Suggested videos ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 12 }}>
          {SUGGESTED.map((v, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, cursor: 'pointer' }}>
              {/* Small thumbnail */}
              <div
                style={{
                  position: 'relative',
                  width: 120,
                  height: 68,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: v.thumbnail ? undefined : 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                  flexShrink: 0,
                }}
              >
                {v.thumbnail && (
                  <img
                    src={v.thumbnail}
                    alt={v.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                {!v.thumbnail && (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    right: 4,
                    background: 'rgba(0,0,0,0.85)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {v.duration}
                </div>
              </div>

              {/* Meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: '0 0 3px',
                    fontSize: 13,
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: '#0f0f0f',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {v.title}
                </p>
                <p style={{ margin: '0 0 1px', fontSize: 12, color: '#606060' }}>{v.channel}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#606060' }}>{v.views}</p>
              </div>

              {/* Three-dot */}
              <button
                type="button"
                aria-label="Mais opções"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 0',
                  alignSelf: 'flex-start',
                  flexShrink: 0,
                }}
              >
                <ThreeDots />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
