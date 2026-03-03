'use client';

import React, { useState } from 'react';

interface PinterestBoardProps {
  boardName?: string;
  name?: string;
  headline?: string;
  username?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  image1?: string;
  postImage?: string;
  thumbnail?: string;
  pinCount?: number;
  description?: string;
  body?: string;
  caption?: string;
}

export const PinterestBoard: React.FC<PinterestBoardProps> = ({
  boardName,
  name,
  headline,
  username,
  brandName,
  profileImage,
  image,
  image1,
  postImage,
  thumbnail,
  pinCount = 124,
  description,
  body,
  caption,
}) => {
  const [following, setFollowing] = useState(false);
  const [hovered, setHovered] = useState(false);

  const displayName = boardName || name || headline || 'Meu Painel';
  const displayUsername = username || brandName || 'criador';
  const displayAvatar = profileImage || '';
  const displayDescription = description || body || caption || '';

  const mainImage = image1 || image || postImage || thumbnail || '';

  // Gradient placeholders using Pinterest red tones
  const placeholderGradients = [
    'linear-gradient(145deg, #E60023 0%, #c0001d 100%)',
    'linear-gradient(145deg, #ff4d6d 0%, #E60023 100%)',
    'linear-gradient(145deg, #c0001d 0%, #8b0014 100%)',
  ];

  const cardStyle: React.CSSProperties = {
    width: 280,
    background: '#fff',
    borderRadius: 12,
    boxShadow: hovered
      ? '0 8px 24px rgba(0,0,0,0.16)'
      : '0 2px 8px rgba(0,0,0,0.10)',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    cursor: 'pointer',
    transition: 'box-shadow 0.2s ease',
    userSelect: 'none',
  };

  const imageGridStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: 186,
    gap: 2,
    overflow: 'hidden',
  };

  const mainImageStyle: React.CSSProperties = {
    flex: '0 0 calc(66.666% - 1px)',
    background: mainImage ? '#e0e0e0' : placeholderGradients[0],
    overflow: 'hidden',
    position: 'relative',
  };

  const smallColumnStyle: React.CSSProperties = {
    flex: '0 0 calc(33.333% - 1px)',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  };

  const smallCellStyle = (gradient: string): React.CSSProperties => ({
    flex: 1,
    background: gradient,
    overflow: 'hidden',
    position: 'relative',
  });

  const imgFillStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '12px 14px 14px',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 15,
    color: '#111',
    margin: '0 0 3px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const pinCountStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#767676',
    margin: '0 0 6px',
  };

  const descStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#767676',
    margin: '0 0 10px',
    lineHeight: '1.4',
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  };

  const creatorRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
    flex: 1,
  };

  const avatarStyle: React.CSSProperties = {
    width: 26,
    height: 26,
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

  const followButtonStyle: React.CSSProperties = {
    flexShrink: 0,
    border: `2px solid ${following ? '#E60023' : '#E60023'}`,
    background: following ? '#E60023' : '#fff',
    color: following ? '#fff' : '#E60023',
    borderRadius: 20,
    padding: '6px 14px',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s ease, color 0.15s ease',
    letterSpacing: '0.01em',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={cardStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Board image grid: 1 large left + 2 small stacked right */}
      <div style={imageGridStyle}>
        <div style={mainImageStyle}>
          {mainImage ? (
            <img src={mainImage} alt={displayName} style={imgFillStyle} />
          ) : null}
        </div>

        <div style={smallColumnStyle}>
          <div style={smallCellStyle(placeholderGradients[1])}>
            {/* secondary image slot — gradient placeholder */}
          </div>
          <div style={smallCellStyle(placeholderGradients[2])}>
            {/* tertiary image slot — gradient placeholder */}
          </div>
        </div>
      </div>

      {/* Board info */}
      <div style={bodyStyle}>
        <p style={titleStyle}>{displayName}</p>
        <p style={pinCountStyle}>
          {pinCount.toLocaleString('pt-BR')} pins
        </p>

        {displayDescription && (
          <p style={descStyle}>{displayDescription}</p>
        )}

        <div style={footerStyle}>
          <div style={creatorRowStyle}>
            <div style={avatarStyle}>
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayUsername}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                  {displayUsername.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span style={usernameStyle}>{displayUsername}</span>
          </div>

          <button
            type="button"
            style={followButtonStyle}
            onClick={(e) => {
              e.stopPropagation();
              setFollowing((f) => !f);
            }}
          >
            {following ? 'Seguindo' : 'Seguir'}
          </button>
        </div>
      </div>
    </div>
  );
};
