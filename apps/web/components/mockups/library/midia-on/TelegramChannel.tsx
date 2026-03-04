'use client';

import React, { useState } from 'react';

interface TelegramChannelProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
  subscribers?: string;
  views?: string;
}

export const TelegramChannel: React.FC<TelegramChannelProps> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  brandName,
  subscribers = '14,8 mil inscritos',
  views = '3,2 mil visualizações',
}) => {
  const [joined, setJoined] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(248);

  const resolvedName = brandName ?? headline ?? title ?? name ?? username ?? 'Canal Oficial';
  const resolvedPost = body ?? caption ?? description ?? text ?? 'Bem-vindo ao nosso canal! Aqui você encontra as últimas notícias e atualizações. Acompanhe e fique por dentro de tudo. 🔔';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const accent = brandColor ?? '#2AABEE';

  const handleLike = () => {
    setLiked((v) => !v);
    setLikeCount((c) => (liked ? c - 1 : c + 1));
  };

  return (
    <div style={{
      width: 380,
      background: '#17212B',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '-apple-system, "Segoe UI", Roboto, sans-serif',
      color: '#fff',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      <style>{`
        @keyframes tg-chan-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes tg-chan-fadein {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tg-chan-card { animation: tg-chan-fadein 0.4s ease; }
        .tg-chan-btn:hover { filter: brightness(1.12); }
        .tg-chan-action:hover { background: rgba(42,171,238,0.12) !important; }
      `}</style>

      {/* Channel header */}
      <div style={{
        background: 'linear-gradient(160deg, #1B2838 0%, #0D1923 100%)',
        padding: '24px 20px 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: resolvedAvatar ? 'transparent' : accent,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: `0 0 0 3px ${accent}55`,
        }}>
          {resolvedAvatar ? (
            <img src={resolvedAvatar} alt={resolvedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{resolvedName.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{resolvedName}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{subscribers}</div>
        </div>
        <button
          type="button"
          aria-label="Entrar no canal"
          className="tg-chan-btn"
          onClick={() => setJoined((v) => !v)}
          style={{
            marginTop: 4,
            padding: '8px 28px',
            borderRadius: 20,
            border: 'none',
            background: joined ? 'rgba(42,171,238,0.18)' : accent,
            color: joined ? accent : '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {joined ? 'Inscrito' : 'Entrar'}
        </button>
      </div>

      {/* Pinned message label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 16px 6px',
        fontSize: 11,
        color: accent,
        fontWeight: 600,
        letterSpacing: 0.3,
        textTransform: 'uppercase',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><path d="m12 17-7 3 3-7 9.5-9.5 4 4L12 17z"/><path d="m14.5 4.5 5 5"/></svg>
        Mensagem fixada
      </div>

      {/* Post card */}
      <div className="tg-chan-card" style={{ padding: '0 12px 12px' }}>
        <div style={{
          background: '#212D3B',
          borderRadius: 10,
          overflow: 'hidden',
        }}>
          {resolvedImage ? (
            <img src={resolvedImage} alt="Post" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{
              width: '100%',
              height: 140,
              background: 'linear-gradient(135deg, #1a3a5c, #0d2137)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          )}
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 14, color: '#E8E8E8', lineHeight: 1.5, margin: 0 }}>{resolvedPost}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{views}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <button
                  type="button"
                  aria-label="Curtir mensagem"
                  className="tg-chan-action"
                  onClick={handleLike}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: liked ? '#FF6B6B' : 'rgba(255,255,255,0.45)',
                    fontSize: 12, borderRadius: 6, padding: '3px 6px',
                    transition: 'color 0.15s',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? '#FF6B6B' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  {likeCount}
                </button>
                <button
                  type="button"
                  aria-label="Compartilhar"
                  className="tg-chan-action"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.45)', borderRadius: 6, padding: '3px 6px',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Blue link example */}
      <div style={{ padding: '4px 26px 16px', fontSize: 13, color: accent }}>
        🔗 <span style={{ textDecoration: 'underline', cursor: 'pointer' }}>ver todos os posts do canal</span>
      </div>
    </div>
  );
};
