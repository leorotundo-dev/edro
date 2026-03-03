import React from 'react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface GoogleBanner160x600Props {
  // Image aliases
  adImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Headline aliases
  headline?: string;
  title?: string;
  name?: string;
  // Description aliases
  description?: string;
  body?: string;
  caption?: string;
  text?: string;
  // Brand identity aliases
  brandName?: string;
  channelName?: string;
  username?: string;
  // Brand logo
  logo?: string;
  profileImage?: string;
  brandImage?: string;
  // CTA + brand
  ctaText?: string;
  brandColor?: string;
  websiteUrl?: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    const u = url.startsWith('http') ? url : `https://${url}`;
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────

export const GoogleBanner160x600: React.FC<GoogleBanner160x600Props> = ({
  adImage,
  image,
  postImage,
  thumbnail,
  headline,
  title,
  name,
  description,
  body,
  caption,
  text,
  brandName,
  channelName,
  username,
  logo,
  profileImage,
  brandImage,
  ctaText = 'Saiba mais',
  brandColor = '#1A73E8',
  websiteUrl = 'exemplo.com.br',
}) => {
  const displayImage = adImage || image || postImage || thumbnail || '';
  const displayHeadline =
    headline || title || name || 'Headline do anúncio aqui';
  const displayDescription =
    description || body || caption || text ||
    'Descrição breve e objetiva do produto ou serviço anunciado.';
  const displayBrand = brandName || channelName || username || 'Marca';
  const displayLogo = logo || profileImage || brandImage || '';
  const displayUrl = extractDomain(websiteUrl);

  const initial = displayBrand.charAt(0).toUpperCase();

  return (
    <div
      style={{
        width: 160,
        height: 600,
        background: '#ffffff',
        border: '1px solid #dadce0',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '"Google Sans", Roboto, Arial, sans-serif',
        color: '#202124',
        boxShadow: '0 1px 4px rgba(60,64,67,0.10)',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* ── Sponsored badge ── */}
      <div
        style={{
          padding: '6px 8px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 500,
            color: '#70757A',
            background: '#F1F3F4',
            borderRadius: 3,
            padding: '2px 5px',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Patrocinado
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="#4285F4" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </div>

      {/* ── Brand logo + name ── */}
      <div
        style={{
          padding: '4px 8px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          flexShrink: 0,
          borderBottom: '1px solid #f1f3f4',
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            background: brandColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {displayLogo ? (
            <img
              src={displayLogo}
              alt={displayBrand}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{initial}</span>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#202124',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayBrand}
        </span>
      </div>

      {/* ── Image area (160×200) ── */}
      <div
        style={{
          width: '100%',
          height: 200,
          flexShrink: 0,
          background: displayImage
            ? '#f8f9fa'
            : `linear-gradient(160deg, ${brandColor}22 0%, ${brandColor}55 100%)`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={displayHeadline}
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
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke={brandColor}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.4 }}
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* ── Text content area ── */}
      <div
        style={{
          flex: 1,
          padding: '10px 10px 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <h4
          style={{
            margin: '0 0 6px',
            fontSize: 13,
            fontWeight: 700,
            lineHeight: 1.35,
            color: '#202124',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {displayHeadline}
        </h4>
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 11,
            lineHeight: 1.45,
            color: '#5F6368',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {displayDescription}
        </p>
      </div>

      {/* ── CTA button ── */}
      <div style={{ padding: '0 10px 8px', flexShrink: 0 }}>
        <button
          type="button"
          style={{
            width: '100%',
            background: brandColor,
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '9px 8px',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {ctaText}
        </button>
      </div>

      {/* ── Domain URL footer ── */}
      <div
        style={{
          padding: '4px 10px 8px',
          flexShrink: 0,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: '#70757A',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {displayUrl}
        </span>
      </div>
    </div>
  );
};
