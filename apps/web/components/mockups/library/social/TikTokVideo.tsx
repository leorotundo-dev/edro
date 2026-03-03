import React, { useState } from 'react';

interface TikTokVideoProps {
  thumbnail?: string;
  username?: string;
  profileImage?: string;
  caption?: string;
  description?: string;
  text?: string;
  likes?: string | number;
  comments?: string | number;
  shares?: string | number;
  /** Song/sound name */
  soundName?: string;
  views?: string | number;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function renderCaption(text: string) {
  return text.split(/((?:#|@)[\w\u00C0-\u017F]+)/g).map((part, i) =>
    part.startsWith('#') || part.startsWith('@') ? (
      <span key={i} style={{ color: '#69C9D0' }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

// TikTok heart icon (official path)
const TikTokHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill={filled ? '#FE2C55' : 'none'} stroke={filled ? '#FE2C55' : 'white'} strokeWidth="3" strokeLinejoin="round">
    <path d="M24 43C24 43 6 32.5 6 18.5C6 13.2 10.2 9 15.5 9C18.6 9 21.3 10.5 23 12.8C24.7 10.5 27.4 9 30.5 9C35.8 9 40 13.2 40 18.5C40 32.5 24 43 24 43Z" />
  </svg>
);

// TikTok comment bubble (official shape)
const TikTokComment = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M24 6C14.06 6 6 13.16 6 22C6 26.6 8.06 30.74 11.5 33.7L10 42L19.06 38.3C20.64 38.76 22.3 39 24 39C33.94 39 42 31.84 42 23C42 14.16 33.94 6 24 6Z" />
  </svg>
);

// TikTok share arrow
const TikTokShare = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 10L42 20L32 30" />
    <path d="M42 20H20C12.27 20 6 26.27 6 34V38" />
  </svg>
);

// TikTok bookmark
const TikTokBookmark = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 8H38V43L24 34L10 43V8Z" />
  </svg>
);

// TikTok music disc (spinning record)
const MusicDisc = ({ image }: { image?: string }) => (
  <>
    <style>{`
      @keyframes tiktokDiscSpin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      .tiktok-disc { animation: tiktokDiscSpin 4s linear infinite; }
    `}</style>
    <div className="tiktok-disc" style={{
      width: 42, height: 42,
      borderRadius: '50%',
      background: image ? `url(${image}) center/cover` : 'linear-gradient(135deg, #1a1a1a 0%, #333 50%, #1a1a1a 100%)',
      border: '3px solid rgba(255,255,255,0.15)',
      boxShadow: '0 0 0 8px rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: 'rgba(255,255,255,0.9)',
        border: '2px solid rgba(0,0,0,0.3)',
      }} />
    </div>
  </>
);

// Plus button overlay for follow
const PlusButton = () => (
  <div style={{
    position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
    width: 18, height: 18, borderRadius: '50%',
    background: '#FE2C55',
    border: '2px solid #000',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <line x1="5" y1="1" x2="5" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="5" x2="9" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </div>
);

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  thumbnail = '',
  username = '@username',
  profileImage = '',
  caption,
  description,
  text,
  likes = '124.5K',
  comments = '2.3K',
  shares = '890',
  soundName = 'Som original',
  views,
}) => {
  const [liked, setLiked] = useState(false);
  const displayCaption = caption || description || text || 'Caption do vídeo vai aqui #fyp #viral';
  const normalizedUser = username.startsWith('@') ? username : `@${username}`;
  const likesLabel = formatCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);
  const commentsLabel = formatCount(comments);
  const sharesLabel = formatCount(shares);

  return (
    <div
      style={{
        position: 'relative',
        width: 320,
        height: 568,
        background: '#000',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: '"TikTok", "Helvetica Neue", Helvetica, Arial, sans-serif',
        color: '#fff',
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Background video/thumbnail */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt="Video"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
        }} />
      )}

      {/* Bottom-left gradient for text readability */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.2) 40%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* ── Top bar: TikTok logo + Following/Para você ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        padding: '16px 16px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 100%)',
      }}>
        {/* TikTok wordmark (simplified) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="24" height="27" viewBox="0 0 24 27" fill="none">
            <path d="M19.3 5.4c-1.5-.8-2.6-2.1-3.1-3.7H13v18c0 1.7-1.4 3-3 3s-3-1.4-3-3 1.4-3 3-3c.3 0 .6 0 .9.1V13.7c-.3 0-.6-.1-.9-.1C5.4 13.6 2 17 2 21.2 2 25.4 5.4 28.8 9.6 28.8c4.2 0 7.6-3.4 7.6-7.6V10.9c1.6 1 3.4 1.6 5.3 1.6V9.3c-1.3 0-2.4-.7-3.2-3.9z" fill="white" />
          </svg>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Seguindo</span>
          <span style={{ fontSize: 15, fontWeight: 700, borderBottom: '2px solid white', paddingBottom: 2 }}>Para você</span>
        </div>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </div>

      {/* ── Right side action panel ── */}
      <div style={{
        position: 'absolute',
        right: 10,
        bottom: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
        zIndex: 10,
      }}>
        {/* Profile avatar with + button */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid white',
            background: '#333',
          }}>
            {profileImage ? (
              <img src={profileImage} alt={normalizedUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }} />
            )}
          </div>
          <PlusButton />
        </div>

        {/* Like */}
        <button
          onClick={() => setLiked((p) => !p)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}
        >
          <TikTokHeart filled={liked} />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{likesLabel}</span>
        </button>

        {/* Comment */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <TikTokComment />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{commentsLabel}</span>
        </div>

        {/* Bookmark */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <TikTokBookmark />
          <span style={{ fontSize: 12, fontWeight: 700 }}>Salvar</span>
        </div>

        {/* Share */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <TikTokShare />
          <span style={{ fontSize: 12, fontWeight: 700 }}>{sharesLabel}</span>
        </div>

        {/* Music disc */}
        <MusicDisc image={profileImage} />
      </div>

      {/* ── Bottom-left: username, caption, sound ── */}
      <div style={{
        position: 'absolute',
        left: 12, right: 72, bottom: 20,
        zIndex: 10,
      }}>
        {/* Username */}
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
          {normalizedUser}
        </div>

        {/* Caption */}
        <p style={{
          fontSize: 14, lineHeight: 1.4,
          margin: '0 0 8px',
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
          {/* music note */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
            {soundName}
          </span>
        </div>
      </div>

      {/* ── Views counter (top-left, optional) ── */}
      {views && (
        <div style={{
          position: 'absolute', top: 56, left: 12,
          fontSize: 13, color: 'rgba(255,255,255,0.8)',
          zIndex: 10,
        }}>
          {formatCount(views)} visualizações
        </div>
      )}
    </div>
  );
};
