'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteTweet {
  displayName?: string;
  handle?: string;
  text?: string;
  image?: string;
  isVerified?: boolean;
}

interface TwitterPostProps {
  // Author
  name?: string;
  username?: string;
  brandName?: string;
  handle?: string;
  profileImage?: string;
  // Content aliases
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  tweetText?: string;
  postText?: string;
  // Media aliases
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Counts
  likeCount?: number | string;
  retweetCount?: number | string;
  replyCount?: number | string;
  viewCount?: number | string;
  bookmarkCount?: number | string;
  // Meta
  timeLabel?: string;
  isVerified?: boolean;
  verifiedTier?: 'blue' | 'gold' | 'gray';
  // Quote tweet
  quoteTweet?: QuoteTweet;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCount(n: number | string | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}mil`;
  }
  return String(n);
}

function renderTweetText(text: string) {
  const parts = text.split(/((?:#|@)[^\s]+|https?:\/\/\S+)/g);
  return parts.map((part, i) => {
    if (/^(#|@|https?:\/\/)/.test(part)) {
      return (
        <span key={i} style={{ color: '#1D9BF0', cursor: 'pointer' }}>
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const XLogo = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const VerifiedBadge = ({ tier }: { tier: 'blue' | 'gold' | 'gray' }) => {
  const color = tier === 'blue' ? '#1D9BF0' : tier === 'gold' ? '#FFD400' : '#71767B';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-label="Conta verificada">
      <path
        fill={color}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
};

const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const ReplyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const RetweetIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#00BA7C' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const LikeIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#F4212E' : 'none'} stroke={active ? '#F4212E' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const BookmarkIcon = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#1D9BF0' : 'none'} stroke={active ? '#1D9BF0' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Action Button ────────────────────────────────────────────────────────────

interface ActionBtnProps {
  label: string;
  icon: React.ReactNode;
  count?: string;
  color?: string;
  onClick?: () => void;
  hoverColor?: string;
}

const ActionBtn = ({ label, icon, count, color = '#71767B', onClick }: ActionBtnProps) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color,
      padding: '4px 6px',
      borderRadius: 20,
      fontSize: 13,
      lineHeight: 1,
    }}
  >
    {icon}
    {count !== undefined && <span style={{ color }}>{count}</span>}
  </button>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitterPost: React.FC<TwitterPostProps> = ({
  name,
  username,
  brandName,
  handle,
  profileImage,
  headline,
  title,
  body,
  caption,
  description,
  text,
  tweetText,
  postText,
  image,
  postImage,
  thumbnail,
  likeCount = 156,
  retweetCount = 34,
  replyCount = 12,
  viewCount = '24mil',
  bookmarkCount,
  timeLabel = '2h',
  isVerified = true,
  verifiedTier = 'blue',
  quoteTweet,
}) => {
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const displayName = name || username || brandName || 'Usuário';
  const displayHandle = handle || '@usuario';
  const normalizedHandle = displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`;
  const displayText = tweetText || postText || body || caption || description || text || headline || title || '';
  const media = image || postImage || thumbnail || '';

  const baseRetweets = typeof retweetCount === 'number' ? retweetCount : 0;
  const baseLikes = typeof likeCount === 'number' ? likeCount : 0;

  const retweetDisplay = typeof retweetCount === 'string' ? retweetCount : formatCount(baseRetweets + (retweeted ? 1 : 0));
  const likeDisplay = typeof likeCount === 'string' ? likeCount : formatCount(baseLikes + (liked ? 1 : 0));
  const replyDisplay = formatCount(replyCount);
  const viewDisplay = formatCount(viewCount);
  const bookmarkDisplay = bookmarkCount !== undefined ? formatCount(bookmarkCount) : undefined;

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #EFF3F4',
        padding: '12px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0F1419',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: X logo top-right */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4, color: '#000000' }}>
        <XLogo size={17} />
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#CFD9DE',
            flexShrink: 0,
          }}
        >
          {profileImage ? (
            <img src={profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 100%)' }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}>
                {displayName}
              </span>
              {isVerified && <VerifiedBadge tier={verifiedTier ?? 'blue'} />}
              <span style={{ color: '#71767B', fontSize: 15, whiteSpace: 'nowrap' }}>{normalizedHandle}</span>
              <span style={{ color: '#71767B', fontSize: 15 }}>·</span>
              <span style={{ color: '#71767B', fontSize: 15, whiteSpace: 'nowrap' }}>{timeLabel}</span>
            </div>
            <button
              type="button"
              aria-label="Mais opções"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#71767B',
                padding: '2px 4px',
                flexShrink: 0,
                lineHeight: 0,
              }}
            >
              <DotsIcon />
            </button>
          </div>

          {/* Tweet text */}
          {displayText ? (
            <p
              style={{
                fontSize: 15,
                lineHeight: '20px',
                margin: '0 0 10px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {renderTweetText(displayText)}
            </p>
          ) : null}

          {/* Media */}
          {media ? (
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid #CFD9DE',
                marginBottom: 10,
              }}
            >
              <img
                src={media}
                alt="Imagem do post"
                style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : null}

          {/* Quote Tweet */}
          {quoteTweet ? (
            <div
              style={{
                border: '1px solid #CFD9DE',
                borderRadius: 12,
                padding: '10px 12px',
                marginBottom: 10,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#CFD9DE',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {quoteTweet.image && (
                    <img src={quoteTweet.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{quoteTweet.displayName || 'Usuário'}</span>
                {quoteTweet.isVerified && <VerifiedBadge tier="blue" />}
                <span style={{ color: '#71767B', fontSize: 14 }}>{quoteTweet.handle || '@usuario'}</span>
              </div>
              <p style={{ fontSize: 14, lineHeight: '18px', margin: 0, color: '#0F1419' }}>
                {quoteTweet.text || ''}
              </p>
            </div>
          ) : null}

          {/* Action bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
              marginLeft: -6,
            }}
          >
            <ActionBtn label="Responder" icon={<ReplyIcon />} count={replyDisplay} />
            <ActionBtn
              label="Repostar"
              icon={<RetweetIcon active={retweeted} />}
              count={retweetDisplay}
              color={retweeted ? '#00BA7C' : '#71767B'}
              onClick={() => setRetweeted((p) => !p)}
            />
            <ActionBtn
              label="Curtir"
              icon={<LikeIcon active={liked} />}
              count={likeDisplay}
              color={liked ? '#F4212E' : '#71767B'}
              onClick={() => setLiked((p) => !p)}
            />
            <ActionBtn label="Compartilhar" icon={<ShareIcon />} />
            <ActionBtn
              label="Salvar"
              icon={<BookmarkIcon active={bookmarked} />}
              count={bookmarkDisplay}
              color={bookmarked ? '#1D9BF0' : '#71767B'}
              onClick={() => setBookmarked((p) => !p)}
            />
          </div>

          {/* Views */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              marginTop: 6,
              color: '#71767B',
              fontSize: 13,
              paddingLeft: 6,
            }}
          >
            <EyeIcon />
            <span>{viewDisplay} visualizações</span>
          </div>
        </div>
      </div>
    </div>
  );
};
