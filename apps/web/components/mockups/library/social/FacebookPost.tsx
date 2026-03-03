'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface FacebookPostProps {
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
  /* Feature props */
  likeCount?: string | number;
  commentCount?: string | number;
  shareCount?: string | number;
  timeLabel?: string;
  isSponsored?: boolean;
  audience?: 'public' | 'friends';
}

const FB_BLUE = '#1877F2';
const GRAY_TEXT = '#65676B';
const LIGHT_BG = '#E4E6EB';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const TEXT_MAX_LENGTH = 280;

function formatCount(n: string | number | undefined, fallback: string): string {
  if (n === undefined || n === null) return fallback;
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return String(n);
}

// Globe icon for public audience
const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm0 14.5a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zm3.5-8.26a7.2 7.2 0 0 0-.74-1.73A5.52 5.52 0 0 1 12.5 6.24zm-7 0A5.52 5.52 0 0 1 5.24 4.51a7.2 7.2 0 0 0-.74 1.73zM8 2.5c.6 0 1.44.92 1.95 2.5H6.05C6.56 3.42 7.4 2.5 8 2.5zM3.5 8c0-.44.06-.87.16-1.28h8.68c.1.41.16.84.16 1.28s-.06.87-.16 1.28H3.66A6.5 6.5 0 0 1 3.5 8zm2.55 4.74A5.52 5.52 0 0 1 3.5 9.76a7.2 7.2 0 0 0 .74 1.73zM8 13.5c-.6 0-1.44-.92-1.95-2.5h3.9C9.44 12.58 8.6 13.5 8 13.5zm2.26-.76a7.2 7.2 0 0 0 .74-1.73 5.52 5.52 0 0 1 2.5 1.73z" />
  </svg>
);

// Friends icon for friends audience
const FriendsIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6 7a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-4 7v-1.5C2 10.6 3.8 9 6 9s4 1.6 4 3.5V14H2zm9.5-7a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM14 14v-1.2c0-1.5-1.1-2.7-2.6-3.1.4-.1.8-.2 1.1-.2 1.9 0 3.5 1.4 3.5 3.2V14H14z" />
  </svg>
);

type LikeType = 'curtir' | 'amei' | 'haha' | 'uau' | 'triste' | 'grr';

const REACTIONS: { type: LikeType; emoji: string; label: string; bg: string }[] = [
  { type: 'curtir', emoji: '👍', label: 'Curtir', bg: FB_BLUE },
  { type: 'amei', emoji: '❤️', label: 'Amei', bg: '#F33E58' },
  { type: 'haha', emoji: '😂', label: 'Haha', bg: '#F7B125' },
  { type: 'uau', emoji: '😮', label: 'Uau', bg: '#F7B125' },
  { type: 'triste', emoji: '😢', label: 'Triste', bg: '#F7B125' },
  { type: 'grr', emoji: '😡', label: 'Grr', bg: '#E9710F' },
];

export const FacebookPost: React.FC<FacebookPostProps> = ({
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
  likeCount,
  commentCount,
  shareCount,
  timeLabel = '2 h',
  isSponsored = false,
  audience = 'public',
}) => {
  const [liked, setLiked] = useState(false);
  const [likeType, setLikeType] = useState<LikeType>('curtir');
  const [expanded, setExpanded] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const displayName = name || brandName || username || 'Nome do Usuário';
  const displayAvatar = profileImage || '';
  const rawText = body || caption || description || text || headline || title || '';
  const displayMedia = postImage || image || thumbnail || '';

  const likes = formatCount(likeCount, '3,4 mil');
  const comments = formatCount(commentCount, '124');
  const shares = formatCount(shareCount, '45');

  const isTruncated = rawText.length > TEXT_MAX_LENGTH;
  const displayText = isTruncated && !expanded ? rawText.slice(0, TEXT_MAX_LENGTH) + '...' : rawText;

  const currentReaction = REACTIONS.find((r) => r.type === likeType);

  function handleLikeClick() {
    setLiked((p) => !p);
  }

  function handleReactionSelect(type: LikeType) {
    setLikeType(type);
    setLiked(true);
    setShowReactionPicker(false);
  }

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
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '12px 16px 8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: LIGHT_BG,
              overflow: 'hidden',
              flexShrink: 0,
              border: `1px solid ${LIGHT_BG}`,
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
                  background: 'linear-gradient(135deg, #8b9cb3 0%, #b0bec5 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" aria-hidden="true">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
            )}
          </div>

          {/* Name + meta */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: '#050505' }}>{displayName}</span>
              {isSponsored && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#fff',
                    background: FB_BLUE,
                    borderRadius: 4,
                    padding: '1px 5px',
                    lineHeight: '16px',
                  }}
                >
                  Patrocinado
                </span>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 3,
                color: GRAY_TEXT,
                fontSize: 13,
              }}
            >
              <span>{timeLabel}</span>
              <span aria-hidden="true">·</span>
              {audience === 'friends' ? <FriendsIcon /> : <GlobeIcon />}
            </div>
          </div>
        </div>

        {/* Overflow + close */}
        <div style={{ display: 'flex', gap: 2, color: GRAY_TEXT }}>
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
            aria-label="Fechar"
            title="Fechar"
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

      {/* Post text */}
      {rawText ? (
        <div style={{ padding: '0 16px 10px', fontSize: 15, lineHeight: '20px', color: '#050505' }}>
          {displayText}
          {isTruncated && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: GRAY_TEXT,
                fontWeight: 700,
                fontSize: 15,
                padding: 0,
                marginLeft: 4,
              }}
            >
              Ver mais
            </button>
          )}
        </div>
      ) : null}

      {/* Media */}
      <div style={{ width: '100%', background: '#F0F2F5', overflow: 'hidden' }}>
        {displayMedia ? (
          <img
            src={displayMedia}
            alt="Imagem da publicação"
            style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#c4c9d4" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 16l5-5 4 4 3-3 4 4" />
              <circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* Reaction summary row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 16px',
          borderBottom: `1px solid ${LIGHT_BG}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontSize: 13,
            color: GRAY_TEXT,
          }}
        >
          {/* Emoji bubbles */}
          <div style={{ display: 'flex' }}>
            {[
              { bg: FB_BLUE, icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="white" aria-hidden="true"><path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" /></svg> },
              { bg: '#F33E58', icon: <svg width="10" height="10" viewBox="0 0 16 16" fill="white" aria-hidden="true"><path d="M8 14.3l-1.2-1.1C3.2 10 1 8.1 1 5.7 1 3.5 2.7 2 5 2c1.2 0 2.4.6 3 1.5C8.6 2.6 9.8 2 11 2c2.3 0 4 1.5 4 3.7 0 2.4-2.2 4.3-5.8 7.5L8 14.3z" /></svg> },
              { bg: '#F7B125', icon: <span style={{ fontSize: 8, lineHeight: 1 }} aria-hidden="true">😂</span> },
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
                  zIndex: 3 - i,
                  position: 'relative',
                }}
              >
                {r.icon}
              </div>
            ))}
          </div>
          <span>{likes}</span>
        </div>

        <div style={{ display: 'flex', gap: 10, fontSize: 13, color: GRAY_TEXT }}>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY_TEXT, fontSize: 13, padding: 0 }}
          >
            {comments} comentários
          </button>
          <button
            type="button"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: GRAY_TEXT, fontSize: 13, padding: 0 }}
          >
            {shares} compartilhamentos
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '2px 4px',
          position: 'relative',
        }}
      >
        {/* Reaction picker popup */}
        {showReactionPicker && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 8,
              background: '#fff',
              borderRadius: 24,
              boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
              padding: '6px 10px',
              display: 'flex',
              gap: 6,
              zIndex: 10,
              border: `1px solid ${LIGHT_BG}`,
            }}
          >
            {REACTIONS.map((r) => (
              <button
                key={r.type}
                type="button"
                title={r.label}
                aria-label={r.label}
                onClick={() => handleReactionSelect(r.type)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 24,
                  padding: 2,
                  lineHeight: 1,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.3)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
              >
                {r.emoji}
              </button>
            ))}
          </div>
        )}

        {/* Curtir */}
        <button
          type="button"
          onClick={handleLikeClick}
          onMouseEnter={() => setShowReactionPicker(true)}
          onMouseLeave={() => setShowReactionPicker(false)}
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
          {liked && currentReaction ? currentReaction.label : 'Curtir'}
        </button>

        {/* Comentar */}
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

        {/* Compartilhar */}
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
