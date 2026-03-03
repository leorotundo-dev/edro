'use client';
import React, { useState } from 'react';

interface KwaiVideoProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  thumbnail?: string;
  postImage?: string;
  caption?: string;
  description?: string;
  body?: string;
  text?: string;
  likes?: string | number;
  comments?: string | number;
  shares?: string | number;
  soundName?: string;
  views?: string | number;
}

function fmtCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

function renderCaption(text: string) {
  return text.split(/((?:#|@)[\w\u00C0-\u017F]+)/g).map((part, i) =>
    part.startsWith('#') || part.startsWith('@')
      ? <span key={i} style={{ color: '#FFE100' }}>{part}</span>
      : <span key={i}>{part}</span>
  );
}

// Kwai logo wordmark (simplified K)
const KwaiLogo = () => (
  <svg width="60" height="24" viewBox="0 0 60 24" fill="none">
    <text x="0" y="20" fontFamily="-apple-system, sans-serif" fontWeight="900" fontSize="22" fill="white" letterSpacing="-0.5">kwai</text>
  </svg>
);

export const KwaiVideo: React.FC<KwaiVideoProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  thumbnail,
  postImage,
  caption,
  description,
  body,
  text,
  likes = 89400,
  comments = 3200,
  shares = 1500,
  soundName = 'Som original',
  views,
}) => {
  const [liked, setLiked] = useState(false);

  const displayName = name || username || brandName || 'usuario';
  const displayHandle = '@' + displayName.toLowerCase().replace(/\s+/g, '');
  const displayAvatar = profileImage || image || '';
  const displayMedia = thumbnail || postImage || '';
  const displayCaption = caption || description || body || text || 'Conteúdo incrível no Kwai! 🔥 #kwai #viral #foryou';

  const likesLabel = fmtCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);
  const commentsLabel = fmtCount(comments);
  const sharesLabel = fmtCount(shares);

  return (
    <>
      <style>{`
        @keyframes kwaiDiscSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .kwai-disc { animation: kwaiDiscSpin 4s linear infinite; }
      `}</style>

      <div style={{
        position: 'relative',
        width: 320,
        height: 568,
        background: '#000',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: '"PingFang SC", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        color: '#fff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.55)',
        flexShrink: 0,
      }}>

        {/* Background media */}
        {displayMedia
          ? <img src={displayMedia} alt="Video" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(160deg, #0d0d0d 0%, #1a0a00 50%, #2d0000 100%)',
            }} />
          )
        }

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 45%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 16px 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 100%)',
        }}>
          {/* Kwai logo */}
          <KwaiLogo />

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 18 }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Seguindo</span>
            <span style={{ fontSize: 14, fontWeight: 700, borderBottom: '2px solid #E50B14', paddingBottom: 2 }}>Para você</span>
          </div>

          {/* Search */}
          <button type="button" aria-label="Buscar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
          </button>
        </div>

        {/* Right action panel */}
        <div style={{
          position: 'absolute', right: 10, bottom: 100,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          zIndex: 10,
        }}>
          {/* Avatar + follow */}
          <div style={{ position: 'relative', marginBottom: 4 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              overflow: 'hidden', border: '2px solid white', background: '#333',
            }}>
              {displayAvatar
                ? <img src={displayAvatar} alt={displayHandle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #E50B14 0%, #ff6b35 100%)' }} />
              }
            </div>
            {/* Follow badge */}
            <div style={{
              position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)',
              width: 20, height: 20, borderRadius: '50%',
              background: '#E50B14', border: '2px solid #000',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <line x1="5" y1="1.5" x2="5" y2="8.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <line x1="1.5" y1="5" x2="8.5" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* Like */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
            >
              <svg width="30" height="30" viewBox="0 0 48 48"
                fill={liked ? '#E50B14' : 'none'}
                stroke={liked ? '#E50B14' : 'white'}
                strokeWidth="3" strokeLinejoin="round"
              >
                <path d="M24 43C24 43 6 32.5 6 18.5C6 13.2 10.2 9 15.5 9C18.6 9 21.3 10.5 23 12.8C24.7 10.5 27.4 9 30.5 9C35.8 9 40 13.2 40 18.5C40 32.5 24 43 24 43Z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{likesLabel}</span>
          </div>

          {/* Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button type="button" aria-label="Comentar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 6C14.06 6 6 13.16 6 22C6 26.6 8.06 30.74 11.5 33.7L10 42L19.06 38.3C20.64 38.76 22.3 39 24 39C33.94 39 42 31.84 42 23C42 14.16 33.94 6 24 6Z" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{commentsLabel}</span>
          </div>

          {/* Share */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="30" height="30" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M32 10L42 20L32 30" />
                <path d="M42 20H20C12.27 20 6 26.27 6 34V38" />
              </svg>
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>{sharesLabel}</span>
          </div>

          {/* Spinning disc */}
          <div
            className="kwai-disc"
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: displayAvatar
                ? `url(${displayAvatar}) center/cover`
                : 'linear-gradient(135deg, #E50B14 0%, #ff6b35 50%, #E50B14 100%)',
              border: '3px solid rgba(255,255,255,0.2)',
              boxShadow: '0 0 0 7px rgba(255,255,255,0.07)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 4,
              flexShrink: 0,
            }}
          >
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)',
              border: '2px solid rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>

        {/* Bottom-left info */}
        <div style={{
          position: 'absolute', left: 12, right: 76, bottom: 20,
          zIndex: 10,
        }}>
          {/* Username */}
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>
            {displayHandle}
          </div>

          {/* Caption */}
          <p style={{
            fontSize: 14, lineHeight: 1.4, margin: '0 0 8px',
            textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {renderCaption(displayCaption)}
          </p>

          {/* Sound bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" fill="white" />
              <circle cx="18" cy="16" r="3" fill="white" />
            </svg>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{soundName}</span>
          </div>
        </div>

        {/* Views badge */}
        {views && (
          <div style={{
            position: 'absolute', top: 56, left: 12,
            fontSize: 13, color: 'rgba(255,255,255,0.75)', zIndex: 10,
          }}>
            {fmtCount(views)} visualizações
          </div>
        )}
      </div>
    </>
  );
};
