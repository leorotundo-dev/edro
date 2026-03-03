'use client';

import React, { useState } from 'react';

interface FacebookWatchProps {
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
  pageName?: string;
  views?: string | number;
  uploadedAgo?: string;
  duration?: string;
  progress?: number;
}

export const FacebookWatch: React.FC<FacebookWatchProps> = ({
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
  pageName,
  views = 284000,
  uploadedAgo = '3 dias atrás',
  duration = '8:42',
  progress = 32,
}) => {
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);

  const resolvedTitle = headline ?? title ?? name ?? brandName ?? body ?? caption ?? description ?? text ?? 'Título do Vídeo';
  const resolvedThumbnail = image ?? postImage ?? thumbnail ?? '';
  const resolvedPage = pageName ?? username ?? brandName ?? name ?? 'Página';
  const resolvedPageAvatar = profileImage ?? '';

  const formattedViews = typeof views === 'number'
    ? views >= 1_000_000
      ? `${(views / 1_000_000).toFixed(1).replace('.', ',')} mi`
      : views >= 1_000
      ? `${(views / 1_000).toFixed(0)} mil`
      : String(views)
    : views;

  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div style={{
      width: 400,
      background: '#1c1e21',
      borderRadius: 8,
      overflow: 'hidden',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      color: '#e4e6eb',
      boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    }}>
      <style>{`
        @keyframes fbw-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .fbw-play-overlay { transition: background 0.2s; }
        .fbw-play-overlay:hover { background: rgba(0,0,0,0.55) !important; }
        .fbw-icon-btn { transition: color 0.15s, transform 0.15s; }
        .fbw-icon-btn:hover { color: #e4e6eb !important; transform: scale(1.1); }
      `}</style>

      {/* Video area */}
      <div
        style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', cursor: 'pointer', overflow: 'hidden' }}
        onClick={() => setPlaying((v) => !v)}
      >
        {resolvedThumbnail ? (
          <img
            src={resolvedThumbnail}
            alt={resolvedTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: playing ? 0.6 : 1, transition: 'opacity 0.3s' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #23272a 0%, #1877f2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
            </svg>
          </div>
        )}

        {/* Play/pause overlay */}
        <div
          className="fbw-play-overlay"
          style={{
            position: 'absolute', inset: 0,
            background: playing ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(0,0,0,0.65)',
            border: '2px solid rgba(255,255,255,0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {playing ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{ marginLeft: 3 }}>
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </div>
        </div>

        {/* Duration badge */}
        <div style={{
          position: 'absolute', bottom: 10, right: 10,
          background: 'rgba(0,0,0,0.8)', color: '#fff',
          fontSize: 12, fontWeight: 700, padding: '2px 7px', borderRadius: 3,
        }}>
          {duration}
        </div>

        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.2)' }}>
          <div style={{ height: '100%', width: `${clampedProgress}%`, background: '#1877f2', borderRadius: 2 }} />
        </div>
      </div>

      {/* Info row */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 14px 14px' }}>
        {/* Page avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: '#3a3b3c', flexShrink: 0, overflow: 'hidden',
        }}>
          {resolvedPageAvatar ? (
            <img src={resolvedPageAvatar} alt={resolvedPage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#1877f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{resolvedPage.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#e4e6eb',
            lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {resolvedTitle}
          </h3>
          <div style={{ fontSize: 12, color: '#b0b3b8', marginBottom: 2 }}>{resolvedPage}</div>
          <div style={{ fontSize: 12, color: '#b0b3b8' }}>{formattedViews} visualizações · {uploadedAgo}</div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            aria-label={liked ? 'Remover curtida' : 'Curtir vídeo'}
            className="fbw-icon-btn"
            onClick={() => setLiked((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: liked ? '#1877f2' : '#b0b3b8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#1877f2' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
            </svg>
          </button>
          <button
            type="button"
            aria-label={saved ? 'Remover dos salvos' : 'Salvar vídeo'}
            className="fbw-icon-btn"
            onClick={() => setSaved((v) => !v)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: saved ? '#42a4ff' : '#b0b3b8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? '#42a4ff' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Mais opções"
            className="fbw-icon-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#b0b3b8' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#b0b3b8">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
