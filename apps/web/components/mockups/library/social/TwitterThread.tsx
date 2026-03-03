'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TweetEntry {
  text?: string;
  image?: string;
  timeLabel?: string;
}

interface TwitterThreadProps {
  // Author aliases (shared across all tweets in thread)
  name?: string;
  username?: string;
  brandName?: string;
  handle?: string;
  profileImage?: string;
  image?: string;
  thumbnail?: string;
  // Per-tweet text aliases
  tweet1?: string;
  tweet2?: string;
  tweet3?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  // Per-tweet images
  postImage?: string;
  tweetImage?: string;
  // Thread count
  tweetCount?: number;
  // Action counts (for last tweet)
  likeCount?: number | string;
  retweetCount?: number | string;
  replyCount?: number | string;
  viewCount?: number | string;
  // Verified
  isVerified?: boolean;
  verifiedTier?: 'blue' | 'gold' | 'gray';
  // Time labels
  timeLabel1?: string;
  timeLabel2?: string;
  timeLabel3?: string;
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
    <svg width="16" height="16" viewBox="0 0 24 24" aria-label="Conta verificada">
      <path
        fill={color}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
};

const ReplyIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const RetweetIcon = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={active ? '#00BA7C' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const LikeIcon = ({ active }: { active: boolean }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill={active ? '#F4212E' : 'none'} stroke={active ? '#F4212E' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ─── Single Tweet Row (non-last) ──────────────────────────────────────────────

interface TweetRowProps {
  displayName: string;
  normalizedHandle: string;
  avatar: string;
  isVerified: boolean;
  verifiedTier: 'blue' | 'gold' | 'gray';
  tweet: TweetEntry;
  isLast: boolean;
  avatarSize?: number;
}

const TweetRow: React.FC<TweetRowProps> = ({
  displayName,
  normalizedHandle,
  avatar,
  isVerified,
  verifiedTier,
  tweet,
  isLast,
  avatarSize = 40,
}) => {
  const text = tweet.text || '';
  const timeLabel = tweet.timeLabel || '2h';

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 16px 0' }}>
      {/* Avatar column with connector line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#CFD9DE',
            flexShrink: 0,
          }}
        >
          {avatar ? (
            <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 100%)' }} />
          )}
        </div>

        {/* Connector line (only if not last) */}
        {!isLast && (
          <div
            style={{
              width: 2,
              flex: 1,
              minHeight: 24,
              background: '#CFD9DE',
              marginTop: 4,
              marginBottom: 4,
              borderRadius: 1,
            }}
          />
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: isLast ? 0 : 2 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
          {isVerified && <VerifiedBadge tier={verifiedTier} />}
          <span style={{ color: '#71767B', fontSize: 14, whiteSpace: 'nowrap' }}>{normalizedHandle}</span>
          <span style={{ color: '#71767B', fontSize: 14 }}>·</span>
          <span style={{ color: '#71767B', fontSize: 14, whiteSpace: 'nowrap' }}>{timeLabel}</span>
        </div>

        {/* Text */}
        {text && (
          <p
            style={{
              fontSize: 15,
              lineHeight: '20px',
              margin: '0 0 8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#0F1419',
            }}
          >
            {renderTweetText(text)}
          </p>
        )}

        {/* Optional image */}
        {tweet.image && (
          <div
            style={{
              borderRadius: 14,
              overflow: 'hidden',
              border: '1px solid #CFD9DE',
              marginBottom: 8,
            }}
          >
            <img
              src={tweet.image}
              alt="Imagem do post"
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitterThread: React.FC<TwitterThreadProps> = ({
  name,
  username,
  brandName,
  handle,
  profileImage,
  image,
  thumbnail,
  tweet1,
  tweet2,
  tweet3,
  headline,
  title,
  body,
  caption,
  description,
  text,
  postImage,
  tweetImage,
  tweetCount = 3,
  likeCount = 89,
  retweetCount = 23,
  replyCount = 14,
  viewCount = '8,2mil',
  isVerified = true,
  verifiedTier = 'blue',
  timeLabel1 = '2h',
  timeLabel2 = '2h',
  timeLabel3 = '2h',
}) => {
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayName = name || username || brandName || 'Usuário';
  const displayHandle = handle || '@usuario';
  const normalizedHandle = displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`;
  const avatar = profileImage || image || thumbnail || '';

  // Resolve per-tweet texts
  const firstText = tweet1 || headline || title || body || caption || description || text || 'Primeira mensagem do tópico...';
  const secondText = tweet2 || 'Continuando o raciocínio do tópico anterior. Há muito mais a explorar sobre este tema.';
  const thirdText = tweet3 || 'E para encerrar: o que você acha? Deixe seu comentário abaixo. #discussão';

  // Build tweets array (up to 3, controlled by tweetCount)
  const count = Math.min(Math.max(tweetCount ?? 3, 2), 3);

  const tweets: TweetEntry[] = [
    { text: firstText, timeLabel: timeLabel1 },
    { text: secondText, timeLabel: timeLabel2, image: count >= 2 ? (postImage || tweetImage || '') : undefined },
    ...(count >= 3 ? [{ text: thirdText, timeLabel: timeLabel3 } as TweetEntry] : []),
  ];

  const lastIdx = tweets.length - 1;
  const lastTweet = tweets[lastIdx];

  const baseLikes = typeof likeCount === 'number' ? likeCount : 0;
  const baseRetweets = typeof retweetCount === 'number' ? retweetCount : 0;
  const likeDisplay = typeof likeCount === 'string' ? likeCount : formatCount(baseLikes + (liked ? 1 : 0));
  const retweetDisplay = typeof retweetCount === 'string' ? retweetCount : formatCount(baseRetweets + (retweeted ? 1 : 0));
  const replyDisplay = formatCount(replyCount);

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #EFF3F4',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0F1419',
        boxSizing: 'border-box',
        paddingBottom: 4,
      }}
    >
      {/* Top row: X logo */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 16px 4px', color: '#000000' }}>
        <XLogo size={17} />
      </div>

      {/* Non-last tweets (with connector lines) */}
      {tweets.slice(0, lastIdx).map((tw, i) => (
        <TweetRow
          key={i}
          displayName={displayName}
          normalizedHandle={normalizedHandle}
          avatar={avatar}
          isVerified={isVerified}
          verifiedTier={verifiedTier ?? 'blue'}
          tweet={tw}
          isLast={false}
        />
      ))}

      {/* Last tweet (with action bar) */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 16px 0' }}>
        {/* Avatar (no connector) */}
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#CFD9DE',
            }}
          >
            {avatar ? (
              <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 100%)' }} />
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px', whiteSpace: 'nowrap' }}>
              {displayName}
            </span>
            {isVerified && <VerifiedBadge tier={verifiedTier ?? 'blue'} />}
            <span style={{ color: '#71767B', fontSize: 14, whiteSpace: 'nowrap' }}>{normalizedHandle}</span>
            <span style={{ color: '#71767B', fontSize: 14 }}>·</span>
            <span style={{ color: '#71767B', fontSize: 14, whiteSpace: 'nowrap' }}>{lastTweet.timeLabel}</span>
          </div>

          {/* Text */}
          {lastTweet.text && (
            <p
              style={{
                fontSize: 15,
                lineHeight: '20px',
                margin: '0 0 10px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: '#0F1419',
              }}
            >
              {renderTweetText(lastTweet.text)}
            </p>
          )}

          {/* Optional image on last tweet */}
          {lastTweet.image && (
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: '1px solid #CFD9DE',
                marginBottom: 10,
              }}
            >
              <img
                src={lastTweet.image}
                alt="Imagem do post"
                style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
              />
            </div>
          )}

          {/* Action bar (last tweet only) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              marginTop: 4,
              marginLeft: -6,
            }}
          >
            {/* Reply */}
            <button
              type="button"
              aria-label="Responder"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#71767B',
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 13,
              }}
            >
              <ReplyIcon />
              <span>{replyDisplay}</span>
            </button>

            {/* Retweet */}
            <button
              type="button"
              aria-label="Repostar"
              onClick={() => setRetweeted((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: retweeted ? '#00BA7C' : '#71767B',
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 13,
              }}
            >
              <RetweetIcon active={retweeted} />
              <span style={{ color: retweeted ? '#00BA7C' : '#71767B' }}>{retweetDisplay}</span>
            </button>

            {/* Like */}
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked((p) => !p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: liked ? '#F4212E' : '#71767B',
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 13,
              }}
            >
              <LikeIcon active={liked} />
              <span style={{ color: liked ? '#F4212E' : '#71767B' }}>{likeDisplay}</span>
            </button>

            {/* Share */}
            <button
              type="button"
              aria-label="Compartilhar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#71767B',
                padding: '4px 8px',
                borderRadius: 20,
                fontSize: 13,
              }}
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>

      {/* "Mostrar este tópico" expandable */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: '10px 16px 12px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: '#1D9BF0',
          fontSize: 14,
          fontWeight: 400,
          padding: 0,
        }}
      >
        <ChevronDownIcon />
        <span>
          {expanded ? 'Ocultar este tópico' : 'Mostrar este tópico'}
        </span>
      </button>

      {/* Thread summary note (when expanded) */}
      {expanded && (
        <div
          style={{
            margin: '0 16px 12px',
            padding: '10px 12px',
            border: '1px solid #EFF3F4',
            borderRadius: 12,
            background: '#F7F9F9',
          }}
        >
          <p style={{ fontSize: 14, color: '#71767B', margin: 0 }}>
            Este tópico contém {count} posts de{' '}
            <span style={{ color: '#1D9BF0' }}>{normalizedHandle}</span>.
          </p>
        </div>
      )}
    </div>
  );
};
