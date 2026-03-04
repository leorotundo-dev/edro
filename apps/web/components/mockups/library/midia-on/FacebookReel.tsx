'use client';

import React, { useState } from 'react';

interface FacebookReelProps {
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
}

export const FacebookReel: React.FC<FacebookReelProps> = ({
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
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(342000);
  const [following, setFollowing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const resolvedUser = username ?? name ?? brandName ?? headline ?? title ?? 'criadordecontent';
  const resolvedCaption = caption ?? body ?? description ?? text ?? 'Esse momento é demais! Não esquece de seguir para mais conteúdos incríveis 🔥 #reels #brasil';
  const resolvedMedia = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  const formatCount = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')} mi`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)} mil`;
    return String(n);
  };

  const handleLike = () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
  };

  return (
    <div style={{
      width: 340,
      aspectRatio: '9 / 16',
      position: 'relative',
      borderRadius: 12,
      overflow: 'hidden',
      background: '#18191a',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      color: '#fff',
    }}>
      <style>{`
        @keyframes fb-reel-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fb-reel-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
        .fb-reel-disc { animation: fb-reel-spin 4s linear infinite; }
        .fb-reel-like-btn:active { animation: fb-reel-pulse 0.3s ease; }
        .fb-reel-follow-btn:hover { background: rgba(255,255,255,0.25) !important; }
        .fb-reel-action-btn:hover { background: rgba(255,255,255,0.12) !important; }
      `}</style>

      {/* Background media */}
      {resolvedMedia ? (
        <img
          src={resolvedMedia}
          alt="Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Top bar — search + camera */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>Reels</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button type="button" aria-label="Pesquisar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <button type="button" aria-label="Câmera" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' }}>
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Center play/pause overlay */}
      <button
        type="button"
        aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
        onClick={() => setPlaying((p) => !p)}
        style={{
          position: 'absolute', inset: 0, background: 'transparent',
          border: 'none', cursor: 'pointer', zIndex: 5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {!playing && (
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3" /></svg>
          </div>
        )}
      </button>

      {/* Right action column */}
      <div style={{
        position: 'absolute', right: 10, bottom: 80, zIndex: 10,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
      }}>
        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button
            type="button"
            aria-label="Curtir reel"
            className="fb-reel-like-btn fb-reel-action-btn"
            onClick={handleLike}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={liked ? '#f5533d' : 'none'} stroke={liked ? '#f5533d' : '#fff'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{formatCount(likeCount)}</span>
        </div>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button type="button" aria-label="Comentar" className="fb-reel-action-btn" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>1,2 mil</span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <button type="button" aria-label="Compartilhar" className="fb-reel-action-btn" style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>4 mil</span>
        </div>

        {/* Mute */}
        <button
          type="button"
          aria-label={muted ? 'Ativar som' : 'Silenciar'}
          className="fb-reel-action-btn"
          onClick={() => setMuted((p) => !p)}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.38)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s' }}
        >
          {muted
            ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          }
        </button>

        {/* Spinning disc */}
        <div
          className="fb-reel-disc"
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: resolvedAvatar ? 'transparent' : resolvedColor,
            border: '3px solid #fff',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {resolvedAvatar
            ? <img src={resolvedAvatar} alt="Disco" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          }
        </div>
      </div>

      {/* Bottom left — author + caption + audio */}
      <div style={{ position: 'absolute', bottom: 16, left: 12, right: 60, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.7)',
            background: resolvedAvatar ? 'transparent' : resolvedColor,
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {resolvedAvatar
              ? <img src={resolvedAvatar} alt={resolvedUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{resolvedUser.charAt(0).toUpperCase()}</span>
            }
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{resolvedUser}</span>
          <button
            type="button"
            aria-label={following ? 'Deixar de seguir' : 'Seguir criador'}
            className="fb-reel-follow-btn"
            onClick={() => setFollowing((p) => !p)}
            style={{
              border: `1px solid rgba(255,255,255,${following ? '0.4' : '0.8'})`,
              background: following ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.25)',
              color: '#fff', borderRadius: 6,
              padding: '3px 10px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            {following ? 'Seguindo' : 'Seguir'}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, textShadow: '0 1px 4px rgba(0,0,0,0.6)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {resolvedCaption}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
          <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>Áudio original · {resolvedUser}</span>
        </div>
      </div>
    </div>
  );
};
