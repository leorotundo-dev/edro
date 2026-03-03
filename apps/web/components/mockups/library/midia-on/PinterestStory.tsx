'use client';

import React, { useState } from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PinterestStoryProps {
  // Background image aliases
  storyImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Title aliases
  title?: string;
  headline?: string;
  name?: string;
  // Creator identity aliases
  username?: string;
  brandName?: string;
  creatorName?: string;
  // Creator avatar aliases
  creatorImage?: string;
  profileImage?: string;
  // Meta
  saveCount?: number;
  category?: string;
}

// ─── SVG Icons ─────────────────────────────────────────────────────────────

const PinterestLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

const HeartIcon = ({ filled, size = 18 }: { filled?: boolean; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#E60023' : 'none'}
    stroke={filled ? '#E60023' : 'rgba(255,255,255,0.85)'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const ShareIcon = ({ size = 17 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="rgba(255,255,255,0.85)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatSaveCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

// ─── Component ─────────────────────────────────────────────────────────────

export const PinterestStory: React.FC<PinterestStoryProps> = ({
  storyImage,
  image,
  postImage,
  thumbnail,
  title,
  headline,
  name,
  username,
  brandName,
  creatorName,
  creatorImage,
  profileImage,
  saveCount = 1240,
  category = 'Ideias',
}) => {
  const [saved, setSaved] = useState(false);

  const PINTEREST_RED = '#E60023';

  const displayImage = storyImage || image || postImage || thumbnail || '';
  const displayTitle = title || headline || name || 'Inspire-se com este pin incrível';
  const displayUsername = creatorName || username || brandName || 'criador';
  const displayAvatar = creatorImage || profileImage || '';
  const displaySaves = formatSaveCount(saved ? saveCount + 1 : saveCount);
  const initial = displayUsername.charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: 240,
        height: 427,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        userSelect: 'none',
        boxShadow: '0 4px 24px rgba(0,0,0,0.28)',
        cursor: 'pointer',
      }}
    >
      {/* ── Background ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: displayImage
            ? '#1a1a1a'
            : `linear-gradient(160deg, ${PINTEREST_RED} 0%, #8b0014 45%, #2d0007 100%)`,
          overflow: 'hidden',
        }}
      >
        {displayImage && (
          <img
            src={displayImage}
            alt={displayTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
      </div>

      {/* ── Top gradient overlay ── */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 120,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.60) 0%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── Bottom gradient overlay ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 220,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      />

      {/* ── Top bar: Pinterest logo + creator info ── */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 10,
        }}
      >
        {/* Pinterest "P" circle */}
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: PINTEREST_RED,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          <PinterestLogo size={16} />
        </div>

        {/* Separator */}
        <div
          style={{
            width: 1,
            height: 18,
            background: 'rgba(255,255,255,0.3)',
            flexShrink: 0,
          }}
        />

        {/* Creator avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '2px solid #fff',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #E60023, #8b0014)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayUsername}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{initial}</span>
          )}
        </div>

        {/* Username */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {displayUsername}
        </span>
      </div>

      {/* ── Center title ── */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: 14,
          right: 14,
          transform: 'translateY(-50%)',
          zIndex: 10,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: '#fff',
            lineHeight: 1.3,
            textShadow: '0 2px 8px rgba(0,0,0,0.6)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {displayTitle}
        </h2>
      </div>

      {/* ── Bottom content ── */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: '0 12px 14px',
        }}
      >
        {/* Category + save count row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          {/* Category pill */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#fff',
              background: 'rgba(255,255,255,0.18)',
              borderRadius: 20,
              padding: '3px 9px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.25)',
            }}
          >
            {category}
          </span>

          {/* Save count */}
          <button
            type="button"
            aria-label={saved ? 'Salvo' : 'Salvar pin'}
            onClick={(e) => {
              e.stopPropagation();
              setSaved((s) => !s);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <HeartIcon filled={saved} size={16} />
            <span style={{ color: saved ? '#E60023' : 'rgba(255,255,255,0.85)' }}>
              {displaySaves}
            </span>
          </button>
        </div>

        {/* Action row: share + "Criar Pin" button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <button
            type="button"
            aria-label="Compartilhar pin"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              backdropFilter: 'blur(4px)',
              padding: 0,
            }}
          >
            <ShareIcon size={16} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSaved((s) => !s);
            }}
            style={{
              flex: 1,
              background: saved ? '#ad081b' : PINTEREST_RED,
              color: '#fff',
              border: 'none',
              borderRadius: 20,
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.01em',
              transition: 'background 0.15s ease',
            }}
          >
            {saved ? 'Salvo' : 'Criar Pin'}
          </button>
        </div>
      </div>
    </div>
  );
};
