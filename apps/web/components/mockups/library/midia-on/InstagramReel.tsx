'use client';
import React, { useState } from 'react';

interface InstagramReelProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  reelImage?: string;
  postImage?: string;
  thumbnail?: string;
  storyImage?: string;
  caption?: string;
  description?: string;
  body?: string;
  text?: string;
  likes?: string | number;
  comments?: string | number;
  shares?: string | number;
  saves?: string | number;
  audioName?: string;
}

function fmtCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

export const InstagramReel: React.FC<InstagramReelProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  reelImage,
  postImage,
  thumbnail,
  storyImage,
  caption,
  description,
  body,
  text,
  likes = 124500,
  comments = 1820,
  shares = 4200,
  saves = 980,
  audioName = 'Áudio original',
}) => {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayName = name || username || brandName || 'usuario';
  const displayHandle = displayName.toLowerCase().replace(/\s+/g, '');
  const displayAvatar = profileImage || image || '';
  const displayMedia = reelImage || postImage || thumbnail || storyImage || '';
  const displayCaption = caption || description || body || text || 'Confira nosso conteúdo exclusivo! 🔥 #reels #viral';
  const displayAudio = audioName;

  const likesLabel = fmtCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);
  const commentsLabel = fmtCount(comments);
  const sharesLabel = fmtCount(shares);
  const savesLabel = fmtCount(saved ? (typeof saves === 'number' ? saves + 1 : saves) : saves);

  return (
    <>
      <style>{`
        @keyframes igDiscSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .ig-reel-disc { animation: igDiscSpin 5s linear infinite; }
      `}</style>

      <div style={{
        position: 'relative',
        width: 340,
        height: 604,
        background: '#000',
        borderRadius: 18,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#fff',
        boxShadow: '0 12px 48px rgba(0,0,0,0.55)',
        flexShrink: 0,
      }}>

        {/* Background media */}
        {displayMedia
          ? <img src={displayMedia} alt="Reel" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 45%, #0f3460 100%)',
            }} />
          )
        }

        {/* Bottom gradient for readability */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.18) 45%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 14px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 10,
        }}>
          {/* Back arrow */}
          <button type="button" aria-label="Voltar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Reels wordmark */}
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
            Reels
          </span>

          {/* Camera icon */}
          <button type="button" aria-label="Câmera" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
        </div>

        {/* Right action column */}
        <div style={{
          position: 'absolute', right: 10, bottom: 96,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          zIndex: 10,
        }}>
          {/* Avatar */}
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <div style={{
              width: 46, height: 46, borderRadius: '50%',
              overflow: 'hidden', border: '2px solid #fff', background: '#333',
            }}>
              {displayAvatar
                ? <img src={displayAvatar} alt={displayHandle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }} />
              }
            </div>
            {/* Follow + */}
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: '#0095F6', border: '2px solid #000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Like */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24"
                fill={liked ? '#FF3040' : 'none'}
                stroke={liked ? '#FF3040' : 'white'}
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{likesLabel}</span>
          </div>

          {/* Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button type="button" aria-label="Comentar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{commentsLabel}</span>
          </div>

          {/* Share */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="white" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{sharesLabel}</span>
          </div>

          {/* Save */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
            <button
              type="button"
              aria-label="Salvar"
              onClick={() => setSaved(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24"
                fill={saved ? 'white' : 'none'}
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 600, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{savesLabel}</span>
          </div>

          {/* More */}
          <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="white" />
              <circle cx="12" cy="12" r="1.5" fill="white" />
              <circle cx="12" cy="19" r="1.5" fill="white" />
            </svg>
          </button>

          {/* Spinning audio disc */}
          <div
            className="ig-reel-disc"
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: displayAvatar
                ? `url(${displayAvatar}) center/cover`
                : 'linear-gradient(135deg, #1a1a1a 0%, #444 50%, #1a1a1a 100%)',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 0 0 6px rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 4,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              border: '2px solid rgba(0,0,0,0.35)',
            }} />
          </div>
        </div>

        {/* Bottom-left: username + caption + audio */}
        <div style={{
          position: 'absolute', left: 12, right: 70, bottom: 18,
          zIndex: 10,
        }}>
          {/* Username + follow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayHandle} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
              : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', border: '1.5px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
            }
            <span style={{ fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
              {displayHandle}
            </span>
            <button type="button" style={{
              background: 'none', border: '1.5px solid rgba(255,255,255,0.85)',
              borderRadius: 6, color: 'white', fontWeight: 600, fontSize: 13,
              padding: '2px 10px', cursor: 'pointer',
            }}>
              Seguir
            </button>
          </div>

          {/* Caption */}
          <p style={{
            fontSize: 14, lineHeight: 1.45, margin: '0 0 8px',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {displayCaption}
          </p>

          {/* Audio bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" fill="white" /><circle cx="18" cy="16" r="3" fill="white" />
            </svg>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
              {displayAudio}
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
