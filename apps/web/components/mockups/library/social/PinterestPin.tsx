'use client';

import React, { useState } from 'react';

interface PinterestPinProps {
  image?: string;
  postImage?: string;
  thumbnail?: string;
  title?: string;
  name?: string;
  headline?: string;
  description?: string;
  body?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  profileImage?: string;
  saveCount?: number;
  boardName?: string;
  timeLabel?: string;
}

export const PinterestPin: React.FC<PinterestPinProps> = ({
  image,
  postImage,
  thumbnail,
  title,
  name,
  headline,
  description,
  body,
  caption,
  username,
  brandName,
  profileImage,
  saveCount = 348,
  boardName = 'Meu Painel',
  timeLabel,
}) => {
  const [saved, setSaved] = useState(false);
  const [hovered, setHovered] = useState(false);

  const displayImage = image || postImage || thumbnail || '';
  const displayTitle = title || name || headline || 'Título do Pin';
  const displayDescription = description || body || caption || '';
  const displayUsername = username || brandName || 'criador';
  const displayAvatar = profileImage || '';
  const displayCount = saved ? saveCount + 1 : saveCount;

  const cardStyle: React.CSSProperties = {
    width: 240,
    background: '#fff',
    borderRadius: 16,
    boxShadow: hovered
      ? '0 8px 24px rgba(0,0,0,0.18)'
      : '0 2px 8px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
    userSelect: 'none',
  };

  const imageWrapStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    paddingTop: '133%',
    background: displayImage
      ? '#e0e0e0'
      : 'linear-gradient(145deg, #f5e0e0 0%, #fbc9c9 50%, #e60023 100%)',
    overflow: 'hidden',
  };

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  const gradientOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
  };

  const saveButtonStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    right: 10,
    background: saved ? '#ad081b' : '#E60023',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    padding: '8px 16px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.2s ease, background 0.15s ease',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  };

  const boardLabelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    left: 10,
    background: 'rgba(255,255,255,0.92)',
    color: '#111',
    borderRadius: 20,
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 600,
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.2s ease',
    maxWidth: '55%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '10px 12px 12px',
  };

  const saveCountStyle: React.CSSProperties = {
    fontSize: 11,
    color: '#767676',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 14,
    color: '#111',
    margin: '0 0 4px',
    lineHeight: '1.35',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#767676',
    margin: '0 0 8px',
    lineHeight: '1.4',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const creatorRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  };

  const avatarStyle: React.CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #E60023, #ad081b)',
    overflow: 'hidden',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const usernameStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#111',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={imageWrapStyle}>
        {displayImage && (
          <img src={displayImage} alt={displayTitle} style={imgStyle} />
        )}

        <div style={gradientOverlayStyle} />

        {boardName && (
          <div style={boardLabelStyle}>{boardName}</div>
        )}

        <button
          type="button"
          style={saveButtonStyle}
          onClick={(e) => {
            e.stopPropagation();
            setSaved((s) => !s);
          }}
        >
          {saved ? 'Salvo' : 'Salvar'}
        </button>
      </div>

      <div style={bodyStyle}>
        <div style={saveCountStyle}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? '#E60023' : 'none'} stroke={saved ? '#E60023' : '#767676'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {displayCount.toLocaleString('pt-BR')} salvamentos
        </div>

        {displayTitle && <p style={titleStyle}>{displayTitle}</p>}
        {displayDescription && <p style={descStyle}>{displayDescription}</p>}

        {timeLabel && (
          <p style={{ fontSize: 11, color: '#767676', margin: '0 0 4px' }}>{timeLabel}</p>
        )}

        <div style={creatorRowStyle}>
          <div style={avatarStyle}>
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>
                {displayUsername.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span style={usernameStyle}>{displayUsername}</span>
        </div>
      </div>
    </div>
  );
};
