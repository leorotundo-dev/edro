'use client';

import React, { useState } from 'react';

interface PinterestIdeaPinProps {
  image?: string;
  postImage?: string;
  thumbnail?: string;
  title?: string;
  name?: string;
  headline?: string;
  description?: string;
  body?: string;
  caption?: string;
  text?: string;
  username?: string;
  brandName?: string;
  profileImage?: string;
  slideCount?: number;
  currentSlide?: number;
}

export const PinterestIdeaPin: React.FC<PinterestIdeaPinProps> = ({
  image,
  postImage,
  thumbnail,
  title,
  name,
  headline,
  description,
  body,
  caption,
  text,
  username,
  brandName,
  profileImage,
  slideCount = 4,
  currentSlide,
}) => {
  const [activeSlide, setActiveSlide] = useState(currentSlide ?? 0);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);

  const displayImage = image || postImage || thumbnail || '';
  const displayTitle = title || name || headline || 'Ideia Incrível';
  const displayDescription = description || body || caption || text || '';
  const displayUsername = username || brandName || 'criador';
  const displayAvatar = profileImage || '';

  const totalSlides = Math.max(1, slideCount);
  const clampedSlide = Math.min(activeSlide, totalSlides - 1);

  // Pinterest red active, light gray inactive
  const PINTEREST_RED = '#E60023';
  const SEGMENT_INACTIVE = 'rgba(255,255,255,0.45)';
  const SEGMENT_ACTIVE = PINTEREST_RED;

  const wrapperStyle: React.CSSProperties = {
    width: 260,
    height: 460,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    userSelect: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
    cursor: 'pointer',
  };

  // Background: image or Pinterest gradient
  const bgStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    background: displayImage
      ? '#1a1a1a'
      : 'linear-gradient(160deg, #E60023 0%, #8b0014 45%, #2d0007 100%)',
    overflow: 'hidden',
  };

  const bgImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  // Dark vignette at top for readability of progress bars + creator row
  const topGradientStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.58) 0%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  };

  // Dark gradient at bottom for title/description
  const bottomGradientStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 60%, transparent 100%)',
    pointerEvents: 'none',
    zIndex: 2,
  };

  // Progress bars row
  const progressRowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    gap: 4,
    zIndex: 10,
  };

  const segmentBase: React.CSSProperties = {
    flex: 1,
    height: 3,
    borderRadius: 2,
    transition: 'background 0.2s ease',
  };

  // Creator row (top-left below progress)
  const creatorRowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 26,
    left: 10,
    right: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  };

  const avatarWrapStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    border: '2px solid #fff',
    overflow: 'hidden',
    flexShrink: 0,
    background: 'linear-gradient(135deg, #E60023, #8b0014)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  };

  const followBtnStyle: React.CSSProperties = {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: '50%',
    border: following ? 'none' : '2px solid #fff',
    background: following ? PINTEREST_RED : 'rgba(255,255,255,0.18)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 300,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    lineHeight: 1,
    transition: 'background 0.15s ease',
  };

  // "Ideia" badge
  const ideaBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: 68,
    left: 10,
    background: '#fff',
    color: PINTEREST_RED,
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 20,
    padding: '3px 9px',
    zIndex: 10,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };

  // Slide tap zones (left half prev, right half next)
  const tapZoneStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    top: 0,
    [side]: 0,
    width: '50%',
    height: '75%',
    zIndex: 5,
    cursor: side === 'left' ? 'w-resize' : 'e-resize',
  });

  // Bottom content
  const bottomContentStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    padding: '0 14px 14px',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 800,
    fontSize: 18,
    color: '#fff',
    margin: '0 0 5px',
    lineHeight: '1.25',
    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 3,
    WebkitBoxOrient: 'vertical',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    margin: '0 0 12px',
    lineHeight: '1.4',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const actionBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };

  const saveActionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    color: saved ? PINTEREST_RED : 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: 600,
  };

  const shareActionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: 600,
  };

  const savePinBtnStyle: React.CSSProperties = {
    background: PINTEREST_RED,
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '8px 18px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  };

  return (
    <div style={wrapperStyle}>
      {/* Background */}
      <div style={bgStyle}>
        {displayImage && (
          <img src={displayImage} alt={displayTitle} style={bgImgStyle} />
        )}
      </div>

      {/* Gradients */}
      <div style={topGradientStyle} />
      <div style={bottomGradientStyle} />

      {/* Progress bars */}
      <div style={progressRowStyle}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            style={{
              ...segmentBase,
              background: i === clampedSlide ? SEGMENT_ACTIVE : SEGMENT_INACTIVE,
            }}
          />
        ))}
      </div>

      {/* Creator row */}
      <div style={creatorRowStyle}>
        <div style={avatarWrapStyle}>
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayUsername}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>
              {displayUsername.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span style={usernameStyle}>{displayUsername}</span>
        <button
          type="button"
          style={followBtnStyle}
          onClick={(e) => {
            e.stopPropagation();
            setFollowing((f) => !f);
          }}
          aria-label={following ? 'Deixar de seguir' : 'Seguir'}
        >
          {following ? '✓' : '+'}
        </button>
      </div>

      {/* Ideia badge */}
      <div style={ideaBadgeStyle}>Ideia</div>

      {/* Slide tap zones */}
      {clampedSlide > 0 && (
        <div
          style={tapZoneStyle('left')}
          onClick={() => setActiveSlide((s) => Math.max(0, s - 1))}
        />
      )}
      {clampedSlide < totalSlides - 1 && (
        <div
          style={tapZoneStyle('right')}
          onClick={() => setActiveSlide((s) => Math.min(totalSlides - 1, s + 1))}
        />
      )}

      {/* Bottom content */}
      <div style={bottomContentStyle}>
        <p style={titleStyle}>{displayTitle}</p>
        {displayDescription && (
          <p style={descStyle}>{displayDescription}</p>
        )}

        <div style={actionBarStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              style={saveActionStyle}
              onClick={(e) => {
                e.stopPropagation();
                setSaved((s) => !s);
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? PINTEREST_RED : 'none'} stroke={saved ? PINTEREST_RED : 'rgba(255,255,255,0.85)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              {saved ? 'Salvo' : 'Salvar'}
            </button>

            <button type="button" style={shareActionStyle}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Compartilhar
            </button>
          </div>

          <button
            type="button"
            style={savePinBtnStyle}
            onClick={(e) => {
              e.stopPropagation();
              setSaved((s) => !s);
            }}
          >
            {saved ? 'Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
