'use client';

import React, { useState } from 'react';

interface TikTokLiveProps {
  // Studio base aliases
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
  // Component-specific
  viewerCount?: string | number;
  likeCount?: string | number;
  giftCount?: string | number;
  isLive?: boolean;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Hardcoded comments for the floating comment area
const COMMENTS = [
  { user: 'ana_s', text: 'Amei esse conteúdo!! 🔥' },
  { user: 'pedro.x', text: 'Já compartilhei com minha equipe' },
  { user: 'Carol_Lima', text: 'Quanto custa o curso? 👀' },
  { user: 'rafael99', text: 'Incrível, obrigado pela live!' },
];

// Floating hearts for gift animation
const HEARTS = ['❤️', '💛', '💜', '💙', '🧡'];

export const TikTokLive: React.FC<TikTokLiveProps> = ({
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
  viewerCount = 3200,
  likeCount = 12400,
  giftCount = 48,
  isLive = true,
}) => {
  const [liked, setLiked] = useState(false);
  const [followed, setFollowed] = useState(false);
  const [localGiftCount, setLocalGiftCount] = useState(
    typeof giftCount === 'number' ? giftCount : parseInt(String(giftCount), 10) || 48
  );

  const resolvedUsername = username ?? name ?? brandName ?? 'criador_oficial';
  const normalizedUser = resolvedUsername.startsWith('@') ? resolvedUsername : `@${resolvedUsername}`;
  const bgImage = thumbnail ?? postImage ?? image ?? '';
  const avatarSrc = profileImage ?? image ?? '';
  const streamTitle = headline ?? title ?? body ?? caption ?? description ?? text ?? 'Tirando dúvidas ao vivo! 🎯';

  const viewers = formatCount(viewerCount);
  const likes = formatCount(typeof likeCount === 'number' ? likeCount + (liked ? 1 : 0) : likeCount);

  const avatarInitials = resolvedUsername
    .replace('@', '')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <style>{`
        @keyframes tiktokLiveHeartFloat {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 0.8; transform: translateY(-80px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-140px) scale(0.8); }
        }
        @keyframes tiktokLiveHeartBounce {
          0%   { transform: scale(1); }
          30%  { transform: scale(1.4); }
          60%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes tiktokLiveGiftSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .tiktok-live-heart-1 { animation: tiktokLiveHeartFloat 2s ease-out infinite; animation-delay: 0s; }
        .tiktok-live-heart-2 { animation: tiktokLiveHeartFloat 2s ease-out infinite; animation-delay: 0.5s; }
        .tiktok-live-heart-3 { animation: tiktokLiveHeartFloat 2s ease-out infinite; animation-delay: 1s; }
        .tiktok-live-heart-4 { animation: tiktokLiveHeartFloat 2s ease-out infinite; animation-delay: 1.5s; }
        .tiktok-live-heart-bounce { animation: tiktokLiveHeartBounce 0.35s ease-out; }
        .tiktok-live-gift-spin { animation: tiktokLiveGiftSpin 3s linear infinite; }
      `}</style>

      <div
        style={{
          position: 'relative',
          width: 320,
          height: 568,
          background: '#000',
          borderRadius: 16,
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
          color: '#fff',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          flexShrink: 0,
        }}
      >
        {/* Background stream image / gradient */}
        {bgImage ? (
          <img
            src={bgImage}
            alt="Live stream"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(160deg, #1a0533 0%, #2d0a5e 35%, #0f0f2e 70%, #000 100%)',
            }}
          />
        )}

        {/* Dark vignette overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.1) 55%, rgba(0,0,0,0.65) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* ── Top bar ── */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '14px 14px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          {/* TikTok wordmark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="23" viewBox="0 0 20 23" fill="none">
              <path
                d="M16.2 4.5c-1.3-.7-2.2-1.8-2.6-3.1H11V18c0 1.4-1.2 2.5-2.5 2.5S6 19.4 6 18s1.2-2.5 2.5-2.5c.25 0 .5 0 .75.1V11.4a7.5 7.5 0 00-.75-.06C4.6 11.34 1.5 14.44 1.5 18c0 3.58 3.1 6.5 6.75 6.5s6.75-2.92 6.75-6.5V9.25c1.36.85 2.9 1.35 4.5 1.35V6.9a4.9 4.9 0 01-3.3-2.4z"
                fill="white"
              />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>AO VIVO</span>
          </div>

          {/* Live indicator + viewers */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isLive && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: '#FE2C55',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#fff',
                  }}
                />
                AO VIVO
              </div>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(0,0,0,0.45)',
                borderRadius: 12,
                padding: '3px 8px',
                fontSize: 12,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {viewers}
            </div>

            {/* X close */}
            <button
              type="button"
              aria-label="Fechar live"
              style={{
                background: 'rgba(0,0,0,0.45)',
                border: 'none',
                borderRadius: '50%',
                width: 26,
                height: 26,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stream duration */}
        <div
          style={{
            position: 'absolute',
            top: 50,
            left: 14,
            background: 'rgba(0,0,0,0.45)',
            borderRadius: 10,
            padding: '3px 9px',
            fontSize: 12,
            color: '#fff',
            zIndex: 10,
          }}
        >
          12:34
        </div>

        {/* ── Floating gift hearts (left side) ── */}
        <div
          style={{
            position: 'absolute',
            left: 14,
            bottom: 130,
            zIndex: 8,
            pointerEvents: 'none',
          }}
        >
          <span className="tiktok-live-heart-1" style={{ position: 'absolute', bottom: 0, left: 0, fontSize: 20 }}>
            ❤️
          </span>
          <span className="tiktok-live-heart-2" style={{ position: 'absolute', bottom: 0, left: 18, fontSize: 16 }}>
            💛
          </span>
          <span className="tiktok-live-heart-3" style={{ position: 'absolute', bottom: 0, left: 4, fontSize: 22 }}>
            💜
          </span>
          <span className="tiktok-live-heart-4" style={{ position: 'absolute', bottom: 0, left: 22, fontSize: 14 }}>
            🧡
          </span>
        </div>

        {/* ── Right sidebar actions ── */}
        <div
          style={{
            position: 'absolute',
            right: 12,
            bottom: 110,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            zIndex: 10,
          }}
        >
          {/* Like button */}
          <button
            type="button"
            aria-label="Curtir live"
            onClick={() => setLiked((l) => !l)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: 0,
            }}
          >
            <svg
              width="30"
              height="30"
              viewBox="0 0 48 48"
              fill={liked ? '#FE2C55' : 'none'}
              stroke={liked ? '#FE2C55' : 'white'}
              strokeWidth="3"
              strokeLinejoin="round"
            >
              <path d="M24 43C24 43 6 32.5 6 18.5C6 13.2 10.2 9 15.5 9C18.6 9 21.3 10.5 23 12.8C24.7 10.5 27.4 9 30.5 9C35.8 9 40 13.2 40 18.5C40 32.5 24 43 24 43Z" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{likes}</span>
          </button>

          {/* Gift button */}
          <button
            type="button"
            aria-label="Enviar presente"
            onClick={() => setLocalGiftCount((c) => c + 1)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: 0,
            }}
          >
            <span className="tiktok-live-gift-spin" style={{ fontSize: 26, display: 'block' }}>
              🎁
            </span>
            <span style={{ fontSize: 11, fontWeight: 700 }}>{localGiftCount}</span>
          </button>

          {/* Share */}
          <button
            type="button"
            aria-label="Compartilhar live"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: 0,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 48 48"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M32 10L42 20L32 30" />
              <path d="M42 20H20C12.27 20 6 26.27 6 34V38" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Compartilhar</span>
          </button>

          {/* Add user */}
          <button
            type="button"
            aria-label="Convidar usuário"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              padding: 0,
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 48 48"
              fill="none"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="20" cy="16" r="8" />
              <path d="M4 40c0-8.84 7.16-16 16-16" />
              <path d="M36 28v12M30 34h12" />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700 }}>Convidar</span>
          </button>
        </div>

        {/* ── Floating comments ── */}
        <div
          style={{
            position: 'absolute',
            left: 12,
            bottom: 100,
            right: 60,
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          {COMMENTS.map((c, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 5,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: 12,
                padding: '5px 10px',
                maxWidth: '90%',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: '#FE2C55', whiteSpace: 'nowrap' }}>
                @{c.user}
              </span>
              <span style={{ fontSize: 12, color: '#fff', lineHeight: '1.3' }}>{c.text}</span>
            </div>
          ))}
        </div>

        {/* ── Bottom streamer row ── */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 14px 16px',
            zIndex: 10,
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}
        >
          {/* Invite friends pill */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <button
              type="button"
              aria-label="Convidar amigos para a live"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 20,
                padding: '6px 16px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Convidar amigos
            </button>
          </div>

          {/* Streamer avatar + name + follow + gift CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #FE2C55',
                background: '#333',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt={normalizedUser}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                avatarInitials
              )}
            </div>

            {/* Username + stream title */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{normalizedUser}</div>
              <div
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.7)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {streamTitle}
              </div>
            </div>

            {/* Follow */}
            <button
              type="button"
              aria-label={followed ? 'Seguindo' : 'Seguir streamer'}
              onClick={() => setFollowed((f) => !f)}
              style={{
                border: `1.5px solid ${followed ? 'rgba(255,255,255,0.4)' : '#FE2C55'}`,
                borderRadius: 6,
                padding: '5px 10px',
                color: '#fff',
                background: followed ? 'rgba(255,255,255,0.1)' : '#FE2C55',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {followed ? 'Seguindo' : 'Seguir'}
            </button>

            {/* Present CTA */}
            <button
              type="button"
              aria-label="Enviar presente"
              style={{
                border: 'none',
                borderRadius: 6,
                padding: '5px 12px',
                color: '#000',
                background: '#69C9D0',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              Presente
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
