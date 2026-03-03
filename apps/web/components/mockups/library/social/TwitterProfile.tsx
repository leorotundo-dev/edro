'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitterProfileProps {
  // Author aliases
  name?: string;
  username?: string;
  brandName?: string;
  handle?: string;
  // Images
  profileImage?: string;
  image?: string;
  thumbnail?: string;
  coverImage?: string;
  // Content aliases
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  bio?: string;
  // Stats
  followerCount?: number | string;
  followingCount?: number | string;
  tweetCount?: number | string;
  // Meta
  location?: string;
  websiteUrl?: string;
  joinDate?: string;
  isVerified?: boolean;
  verifiedTier?: 'blue' | 'gold' | 'gray';
  isPremium?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatStatCount(n: number | string | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}mil`;
  }
  return String(n);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const XLogo = ({ size = 20, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const VerifiedBadge = ({ tier }: { tier: 'blue' | 'gold' | 'gray' }) => {
  const color = tier === 'blue' ? '#1D9BF0' : tier === 'gold' ? '#FFD400' : '#71767B';
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-label="Conta verificada">
      <path
        fill={color}
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"
      />
    </svg>
  );
};

const LocationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const MessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
    <circle cx="5" cy="12" r="1" fill="currentColor" />
  </svg>
);

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS = ['Postagens', 'Respostas', 'Destaques', 'Artigos', 'Mídia', 'Curtidas'];

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitterProfile: React.FC<TwitterProfileProps> = ({
  name,
  username,
  brandName,
  handle,
  profileImage,
  image,
  thumbnail,
  coverImage,
  headline,
  title,
  body,
  caption,
  description,
  text,
  bio,
  followerCount = 12400,
  followingCount = 487,
  tweetCount,
  location,
  websiteUrl,
  joinDate = 'março de 2021',
  isVerified = true,
  verifiedTier = 'blue',
  isPremium = false,
}) => {
  const [followed, setFollowed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const displayName = name || username || brandName || 'Usuário';
  const displayHandle = handle || '@usuario';
  const normalizedHandle = displayHandle.startsWith('@') ? displayHandle : `@${displayHandle}`;
  const avatar = profileImage || image || thumbnail || '';
  const displayBio = bio || body || caption || description || text || headline || title || '';

  const followerDisplay = formatStatCount(followerCount);
  const followingDisplay = formatStatCount(followingCount);

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0F1419',
        boxSizing: 'border-box',
        overflowX: 'hidden',
      }}
    >
      {/* Cover photo */}
      <div
        style={{
          width: '100%',
          height: 150,
          background: coverImage
            ? undefined
            : 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 50%, #0a4a8f 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {coverImage && (
          <img
            src={coverImage}
            alt="Capa"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* X logo top-right on cover */}
        <div style={{ position: 'absolute', top: 12, right: 14, color: 'rgba(255,255,255,0.7)' }}>
          <XLogo size={20} />
        </div>
      </div>

      {/* Avatar + action buttons row */}
      <div
        style={{
          padding: '0 16px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          position: 'relative',
          marginTop: -40,
          marginBottom: 0,
        }}
      >
        {/* Avatar (overlaps cover) */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            overflow: 'hidden',
            background: '#CFD9DE',
            border: '4px solid #ffffff',
            flexShrink: 0,
          }}
        >
          {avatar ? (
            <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 100%)',
              }}
            />
          )}
        </div>

        {/* Action buttons (top-right) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingTop: 52,
          }}
        >
          {/* More options */}
          <button
            type="button"
            aria-label="Mais opções"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid #CFD9DE',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F1419',
            }}
          >
            <DotsIcon />
          </button>

          {/* Message button */}
          <button
            type="button"
            aria-label="Mensagem"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              border: '1px solid #CFD9DE',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0F1419',
            }}
          >
            <MessageIcon />
          </button>

          {/* Follow / Following button */}
          <button
            type="button"
            aria-label={followed ? 'Deixar de seguir' : 'Seguir'}
            onClick={() => setFollowed((p) => !p)}
            style={{
              height: 34,
              padding: '0 18px',
              borderRadius: 9999,
              border: followed ? '1px solid #CFD9DE' : 'none',
              background: followed ? 'transparent' : '#0F1419',
              color: followed ? '#0F1419' : '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {followed ? 'Seguindo' : 'Seguir'}
          </button>
        </div>
      </div>

      {/* Profile info */}
      <div style={{ padding: '12px 16px 0' }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontWeight: 800, fontSize: 22, lineHeight: '28px' }}>{displayName}</span>
          {isVerified && <VerifiedBadge tier={verifiedTier ?? 'blue'} />}
          {isPremium && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#000',
                color: '#fff',
                borderRadius: 4,
                padding: '1px 5px',
                fontSize: 11,
                fontWeight: 700,
                gap: 3,
              }}
            >
              <XLogo size={11} color="#fff" />
              Premium
            </span>
          )}
        </div>

        {/* Handle */}
        <p style={{ color: '#71767B', fontSize: 15, margin: '0 0 10px' }}>{normalizedHandle}</p>

        {/* Bio */}
        {displayBio && (
          <p
            style={{
              fontSize: 15,
              lineHeight: '20px',
              margin: '0 0 10px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {displayBio}
          </p>
        )}

        {/* Meta info row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 14px',
            color: '#71767B',
            fontSize: 14,
            marginBottom: 10,
            alignItems: 'center',
          }}
        >
          {location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <LocationIcon />
              {location}
            </span>
          )}
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#1D9BF0',
                textDecoration: 'none',
              }}
            >
              <LinkIcon />
              {websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
            </a>
          )}
          {joinDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarIcon />
              Ingressou em {joinDate}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginBottom: 14,
            fontSize: 14,
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong style={{ fontWeight: 700, color: '#0F1419' }}>{followingDisplay}</strong>
            <span style={{ color: '#71767B' }}> Seguindo</span>
          </span>
          <span>
            <strong style={{ fontWeight: 700, color: '#0F1419' }}>{followerDisplay}</strong>
            <span style={{ color: '#71767B' }}> Seguidores</span>
          </span>
          {tweetCount !== undefined && (
            <span>
              <strong style={{ fontWeight: 700, color: '#0F1419' }}>{formatStatCount(tweetCount)}</strong>
              <span style={{ color: '#71767B' }}> Posts</span>
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #EFF3F4',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(i)}
            style={{
              flex: '0 0 auto',
              padding: '14px 12px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: activeTab === i ? 700 : 400,
              color: activeTab === i ? '#0F1419' : '#71767B',
              borderBottom: activeTab === i ? '2px solid #1D9BF0' : '2px solid transparent',
              marginBottom: -1,
              whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};
