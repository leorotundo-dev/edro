import React from 'react';

interface GoogleDisplayAdProps {
  adImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  headline?: string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  caption?: string;
  ctaText?: string;
  logo?: string;
  profileImage?: string;
  brandName?: string;
  username?: string;
  brandColor?: string;
}

// Google "Ad" badge
const AdBadge = () => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #70757A',
    borderRadius: 3,
    padding: '0 4px',
    lineHeight: '16px',
  }}>
    <span style={{ fontSize: 11, fontWeight: 600, color: '#70757A', letterSpacing: '0.01em' }}>Patrocinado</span>
  </div>
);

// Info icon
const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" stroke="#70757A" strokeWidth="1.5" />
    <line x1="12" y1="11" x2="12" y2="17" stroke="#70757A" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="12" cy="8" r="0.8" fill="#70757A" />
  </svg>
);

export const GoogleDisplayAd: React.FC<GoogleDisplayAdProps> = ({
  adImage,
  image,
  postImage,
  thumbnail,
  headline,
  name,
  title,
  description,
  body,
  caption,
  ctaText = 'Saiba Mais',
  logo,
  profileImage,
  brandName,
  username,
  brandColor = '#1A73E8',
}) => {
  const displayImage = adImage || image || postImage || thumbnail || '';
  const displayHeadline = headline || name || title || 'Headline do Anúncio';
  const displayDesc = description || body || caption || 'Descrição curta e persuasiva da oferta.';
  const displayLogo = logo || profileImage || '';
  const displayBrand = brandName || username || 'Sua Marca';

  return (
    <div style={{
      width: 300,
      height: 250,
      background: '#fff',
      fontFamily: 'Google Sans, "Helvetica Neue", Helvetica, Arial, sans-serif',
      overflow: 'hidden',
      position: 'relative',
      border: '1px solid #E0E0E0',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 1px 6px rgba(32,33,36,0.12)',
    }}>
      {/* Creative image — top 150px */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 150,
        flexShrink: 0,
        background: '#F8F9FA',
        overflow: 'hidden',
      }}>
        {displayImage
          ? (
            <img
              src={displayImage}
              alt={displayHeadline}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )
          : (
            <div style={{
              width: '100%', height: '100%',
              background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )
        }
        {/* Ad badge overlay */}
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <AdBadge />
        </div>
      </div>

      {/* Bottom content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '8px 10px 10px', gap: 4 }}>
        {/* Brand + info row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {displayLogo
              ? (
                <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  <img src={displayLogo} alt={displayBrand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )
              : (
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>
                    {displayBrand.charAt(0).toUpperCase()}
                  </span>
                </div>
              )
            }
            <span style={{ fontSize: 12, color: '#70757A', fontWeight: 500 }}>{displayBrand}</span>
          </div>
          <button type="button" aria-label="Informações do anúncio" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            <InfoIcon />
          </button>
        </div>

        {/* Headline */}
        <h4 style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#202124',
          margin: 0,
          lineHeight: '18px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {displayHeadline}
        </h4>

        {/* Description */}
        <p style={{
          fontSize: 12,
          color: '#5F6368',
          margin: 0,
          lineHeight: '16px',
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {displayDesc}
        </p>

        {/* CTA button */}
        <button type="button" style={{
          background: brandColor,
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          width: '100%',
          letterSpacing: '0.01em',
          marginTop: 2,
        }}>
          {ctaText}
        </button>
      </div>
    </div>
  );
};
