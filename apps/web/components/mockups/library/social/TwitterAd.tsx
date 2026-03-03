'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitterAdProps {
  // Author
  name?: string;
  brandName?: string;
  username?: string;
  handle?: string;
  profileImage?: string;
  brandLogo?: string;
  // Content aliases
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  adText?: string;
  // Media aliases
  image?: string;
  postImage?: string;
  adImage?: string;
  thumbnail?: string;
  // Ad-specific
  ctaText?: string;
  websiteUrl?: string;
  websiteTitle?: string;
  websiteImage?: string;
  adLabel?: string;
  // Counts
  likeCount?: number | string;
  retweetCount?: number | string;
  replyCount?: number | string;
  viewCount?: number | string;
  bookmarkCount?: number | string;
  // Meta
  isVerified?: boolean;
  verifiedTier?: 'blue' | 'gold' | 'gray';
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

function renderText(text: string) {
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

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const XLogo = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

const VerifiedBadge = ({ tier }: { tier: 'blue' | 'gold' | 'gray' }) => {
  const color = tier === 'blue' ? '#1D9BF0' : tier === 'gold' ? '#FFD400' : '#71767B';
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-label="Conta verificada">
      <path
        fill={color}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
};

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

const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// ─── Action Button ────────────────────────────────────────────────────────────

const ActionBtn = ({
  label,
  icon,
  count,
  color = '#71767B',
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  count?: string;
  color?: string;
  onClick?: () => void;
}) => (
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

export const TwitterAd: React.FC<TwitterAdProps> = ({
  name,
  brandName,
  username,
  handle,
  profileImage,
  brandLogo,
  headline,
  title,
  body,
  caption,
  description,
  text,
  adText,
  image,
  postImage,
  adImage,
  thumbnail,
  ctaText = 'Saiba mais',
  websiteUrl,
  websiteTitle,
  websiteImage,
  adLabel,
  likeCount = 284,
  retweetCount = 97,
  replyCount = 42,
  viewCount = '18mil',
  bookmarkCount,
  isVerified = true,
  verifiedTier = 'blue',
}) => {
  const [liked, setLiked] = useState(false);
  const [retweeted, setRetweeted] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const displayName = name || brandName || username || 'Marca';
  const displayHandle = handle || '@marca';
  const normalizedHandle = displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`;
  const displayLogo = brandLogo || profileImage || '';
  const displayImage = adImage || image || postImage || thumbnail || '';
  const displayText = adText || text || body || caption || description || '';
  const displayTitle = headline || title || websiteTitle || '';

  const baseLikes = typeof likeCount === 'number' ? likeCount : 0;
  const baseRetweets = typeof retweetCount === 'number' ? retweetCount : 0;

  const likeDisplay = typeof likeCount === 'string' ? likeCount : formatCount(baseLikes + (liked ? 1 : 0));
  const retweetDisplay = typeof retweetCount === 'string' ? retweetCount : formatCount(baseRetweets + (retweeted ? 1 : 0));
  const replyDisplay = formatCount(replyCount);
  const viewDisplay = formatCount(viewCount);
  const bookmarkDisplay = bookmarkCount !== undefined ? formatCount(bookmarkCount) : undefined;

  const domain = websiteUrl ? extractDomain(websiteUrl) : normalizedHandle.replace('@', '');

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
      }}
    >
      <div style={{ padding: '12px 16px' }}>
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
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                {/* Promoted indicator */}
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    color: '#71767B',
                    fontSize: 13,
                  }}
                >
                  <XLogo size={11} color="#71767B" />
                  <span>{adLabel || 'Promovido'}</span>
                </span>
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

            {/* Ad text */}
            {displayText ? (
              <p
                style={{
                  fontSize: 15,
                  lineHeight: '20px',
                  margin: '0 0 12px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {renderText(displayText)}
              </p>
            ) : null}

            {/* Main image with CTA card */}
            {displayImage ? (
              <div
                style={{
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid #CFD9DE',
                  marginBottom: 12,
                }}
              >
                <img
                  src={displayImage}
                  alt="Anúncio"
                  style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block' }}
                />
                {/* CTA bar below image */}
                <div
                  style={{
                    background: '#F7F9F9',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    borderTop: '1px solid #CFD9DE',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, color: '#71767B', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <LinkIcon />
                      {domain}
                    </p>
                    {displayTitle && (
                      <p
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#0F1419',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {displayTitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      background: '#0F1419',
                      border: 'none',
                      borderRadius: 9999,
                      padding: '7px 16px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {ctaText}
                  </button>
                </div>
              </div>
            ) : null}

            {/* Website card (no image) */}
            {!displayImage && websiteUrl ? (
              <div
                style={{
                  border: '1px solid #CFD9DE',
                  borderRadius: 14,
                  overflow: 'hidden',
                  marginBottom: 12,
                }}
              >
                {websiteImage && (
                  <img
                    src={websiteImage}
                    alt={websiteTitle || 'Site'}
                    style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }}
                  />
                )}
                <div
                  style={{
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    background: '#F7F9F9',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 12, color: '#71767B', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <LinkIcon />
                      {domain}
                    </p>
                    {displayTitle && (
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#0F1419', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayTitle}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      background: '#0F1419',
                      border: 'none',
                      borderRadius: 9999,
                      padding: '7px 16px',
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#fff',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {ctaText}
                  </button>
                </div>
              </div>
            ) : null}

            {/* CTA button standalone (no image, no website card) */}
            {!displayImage && !websiteUrl && ctaText ? (
              <button
                type="button"
                style={{
                  display: 'block',
                  width: '100%',
                  background: 'none',
                  border: '1px solid #CFD9DE',
                  borderRadius: 9999,
                  padding: '9px 16px',
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#0F1419',
                  cursor: 'pointer',
                  marginBottom: 12,
                  textAlign: 'center',
                }}
              >
                {ctaText}
              </button>
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

      {/* Promovido footer */}
      <div
        style={{
          borderTop: '1px solid #EFF3F4',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: '#71767B',
          fontSize: 13,
        }}
      >
        <XLogo size={13} color="#71767B" />
        <span>{adLabel || 'Promovido'}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12 }}>Por que vejo este anúncio?</span>
      </div>
    </div>
  );
};
