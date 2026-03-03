'use client';

import React, { useState } from 'react';

interface FacebookCoverProps {
  /* Studio aliases */
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  coverImage?: string;
  /* Feature props */
  followerCount?: string | number;
  friendCount?: string | number;
  isPage?: boolean;
  isVerified?: boolean;
  tabActive?: 'publicacoes' | 'sobre' | 'amigos' | 'fotos' | 'videos';
}

const FB_BLUE = '#1877F2';
const GRAY_TEXT = '#65676B';
const LIGHT_BG = '#E4E6EB';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function formatCount(n: string | number | undefined, fallback: string): string {
  if (n === undefined || n === null) return fallback;
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return String(n);
}

type Tab = 'publicacoes' | 'sobre' | 'amigos' | 'fotos' | 'videos';

const TABS: { key: Tab; label: string }[] = [
  { key: 'publicacoes', label: 'Publicações' },
  { key: 'sobre', label: 'Sobre' },
  { key: 'amigos', label: 'Amigos' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'videos', label: 'Vídeos' },
];

export const FacebookCover: React.FC<FacebookCoverProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  coverImage,
  followerCount,
  friendCount,
  isPage = false,
  isVerified = false,
  tabActive = 'publicacoes',
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(tabActive);
  const [followed, setFollowed] = useState(false);

  const displayName = name || brandName || username || (isPage ? 'Nome da Página' : 'Nome do Usuário');
  const displayCover = coverImage || image || postImage || thumbnail || '';
  const displayAvatar = profileImage || '';
  const displayBio = body || caption || description || text || headline || title || '';
  const followers = formatCount(followerCount, '3,4 mil');
  const friends = formatCount(friendCount, '128');

  return (
    <div
      style={{
        width: 400,
        maxWidth: '100%',
        background: '#fff',
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily: FONT,
        color: '#050505',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        border: '1px solid #E4E6EB',
      }}
    >
      {/* Cover photo */}
      <div
        style={{
          width: '100%',
          height: 142,
          background: displayCover
            ? undefined
            : 'linear-gradient(135deg, #1877F2 0%, #42a5f5 50%, #0052cc 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {displayCover && (
          <img
            src={displayCover}
            alt="Foto de capa"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* Edit cover button (decorative) */}
        <button
          type="button"
          style={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#050505',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.83 1.42l-.08.08H4.5v-1.25l.08-.08 9.38-9.38 1.25 1.25-9.38 9.38zm14.44-12.02a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
          </svg>
          Editar capa
        </button>
      </div>

      {/* Avatar + name row */}
      <div style={{ position: 'relative', padding: '0 16px 0' }}>
        {/* Avatar circle — overlaps cover */}
        <div
          style={{
            position: 'absolute',
            top: -45,
            left: 16,
            width: 90,
            height: 90,
            borderRadius: '50%',
            border: '4px solid #fff',
            background: LIGHT_BG,
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #8b9cb3 0%, #b0bec5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
          )}
        </div>

        {/* Spacer for avatar overlap */}
        <div style={{ height: 52 }} />

        {/* Name + verified */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 700, lineHeight: '28px' }}>{displayName}</span>
          {isVerified && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill={FB_BLUE}>
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 0 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 0 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 0 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 0-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 0-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 0-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 0-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 0 .806-1.946 3.42 3.42 0 0 1 3.138-3.138z" />
            </svg>
          )}
          {isPage && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: GRAY_TEXT,
                background: LIGHT_BG,
                borderRadius: 4,
                padding: '1px 6px',
              }}
            >
              Página
            </span>
          )}
        </div>

        {/* Follower / friend count */}
        <p style={{ fontSize: 13, color: GRAY_TEXT, margin: '0 0 4px', lineHeight: '18px' }}>
          {isPage ? (
            <span>
              <strong style={{ color: '#050505' }}>{followers}</strong> seguidores
            </span>
          ) : (
            <span>
              <strong style={{ color: '#050505' }}>{friends}</strong> amigos
              {' · '}
              <strong style={{ color: '#050505' }}>{followers}</strong> seguidores
            </span>
          )}
        </p>

        {/* Bio */}
        {displayBio && (
          <p style={{ fontSize: 14, color: GRAY_TEXT, margin: '0 0 10px', lineHeight: '20px' }}>
            {displayBio}
          </p>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {isPage ? (
            <>
              <button
                type="button"
                onClick={() => setFollowed((p) => !p)}
                style={{
                  flex: 1,
                  minWidth: 80,
                  background: followed ? LIGHT_BG : FB_BLUE,
                  color: followed ? '#050505' : '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                {followed ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                    </svg>
                    Seguindo
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                    Seguir
                  </>
                )}
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  minWidth: 80,
                  background: LIGHT_BG,
                  color: '#050505',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                </svg>
                Mensagem
              </button>
              <button
                type="button"
                aria-label="Mais opções"
                title="Mais opções"
                style={{
                  background: LIGHT_BG,
                  color: '#050505',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5H7z" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                style={{
                  flex: 1,
                  minWidth: 100,
                  background: LIGHT_BG,
                  color: '#050505',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                Adicionar aos favoritos
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  minWidth: 80,
                  background: LIGHT_BG,
                  color: '#050505',
                  border: 'none',
                  borderRadius: 6,
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                </svg>
                Editar perfil
              </button>
            </>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: LIGHT_BG, margin: '0 0 0 0' }} />

      {/* Tab navigation */}
      <div
        style={{
          display: 'flex',
          overflowX: 'auto',
          scrollbarWidth: 'none',
          borderTop: `1px solid ${LIGHT_BG}`,
        }}
      >
        {TABS.map(({ key, label }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                flexShrink: 0,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 600,
                color: isActive ? FB_BLUE : GRAY_TEXT,
                background: 'none',
                border: 'none',
                borderBottom: isActive ? `3px solid ${FB_BLUE}` : '3px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                lineHeight: '18px',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
