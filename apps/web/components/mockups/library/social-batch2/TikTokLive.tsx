import React, { useState } from 'react';

interface TikTokLiveProps {
  username?: string;
  name?: string;
  profileImage?: string;
  liveImage?: string;
  image?: string;
  storyImage?: string;
  viewers?: string | number;
  likes?: string | number;
  caption?: string;
  description?: string;
  text?: string;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const TKHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill={filled ? '#FE2C55' : 'none'} stroke={filled ? '#FE2C55' : 'white'} strokeWidth="3" strokeLinejoin="round">
    <path d="M24 43C24 43 6 32.5 6 18.5C6 13.2 10.2 9 15.5 9C18.6 9 21.3 10.5 23 12.8C24.7 10.5 27.4 9 30.5 9C35.8 9 40 13.2 40 18.5C40 32.5 24 43 24 43Z" />
  </svg>
);

const TKGift = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="18" width="36" height="8" rx="2" /><rect x="10" y="26" width="28" height="16" rx="2" />
    <path d="M24 18v24" /><path d="M24 18c0 0-4-8-8-6s-2 6 8 6z" /><path d="M24 18c0 0 4-8 8-6s2 6-8 6z" />
  </svg>
);

const TKShare = () => (
  <svg width="28" height="28" viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M32 10L42 20L32 30" /><path d="M42 20H20C12.27 20 6 26.27 6 34V38" />
  </svg>
);

// Floating heart animation element
const FloatingHeart = ({ x, y }: { x: number; y: number }) => (
  <div style={{ position: 'absolute', left: x, bottom: y, color: '#FE2C55', fontSize: 20, opacity: 0.85, pointerEvents: 'none' }}>♥</div>
);

export const TikTokLive: React.FC<TikTokLiveProps> = ({
  username = '@username',
  name,
  profileImage = '',
  liveImage,
  image,
  storyImage,
  viewers = '3,2K',
  likes = '12,5K',
  caption,
  description,
  text,
}) => {
  const [liked, setLiked] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const displayUser = name || username;
  const normalizedUser = displayUser.startsWith('@') ? displayUser : `@${displayUser}`;
  const media = liveImage || storyImage || image || '';
  const displayCaption = caption || description || text || '';

  const handleLike = () => {
    setLiked(p => !p);
    const id = Date.now();
    const x = 20 + Math.random() * 30;
    const y = 80 + Math.random() * 60;
    setHearts(prev => [...prev.slice(-8), { id, x, y }]);
  };

  return (
    <div style={{ position: 'relative', width: 320, height: 568, background: '#000', borderRadius: 16, overflow: 'hidden', fontFamily: '"TikTok", "Helvetica Neue", Helvetica, Arial, sans-serif', color: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

      {/* Background */}
      {media ? (
        <img src={media} alt="Live" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }} />
      )}

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Profile */}
          <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', border: '2px solid #FE2C55', background: '#333', flexShrink: 0 }}>
            {profileImage ? <img src={profileImage} alt={normalizedUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FE2C55, #ff6b35)' }} />}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, margin: 0, lineHeight: '18px' }}>{normalizedUser}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.45)', borderRadius: 12, padding: '2px 7px' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z" /></svg>
                <span style={{ fontSize: 11, fontWeight: 600 }}>{formatCount(viewers)}</span>
              </div>
            </div>
          </div>
          {/* Follow button */}
          <button type="button" style={{ background: '#FE2C55', border: 'none', borderRadius: 4, padding: '5px 12px', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            Seguir
          </button>
        </div>
        {/* LIVE badge + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#FE2C55', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>AO VIVO</span>
          </div>
          <button type="button" aria-label="Fechar" style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      {/* Chat messages area */}
      <div style={{ position: 'absolute', left: 12, right: 60, bottom: 90, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
        {[
          { user: 'user123', msg: '🔥 Que conteúdo incrível!', color: '#69C9D0' },
          { user: 'fã_oficial', msg: 'Amei muito isso! 😍', color: '#FF9F0A' },
          { user: 'marketing_br', msg: 'Pode repetir o link?', color: '#32D74B' },
        ].map(({ user, msg, color }) => (
          <div key={user} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.45)', borderRadius: 16, padding: '4px 10px', maxWidth: '100%' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{user}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
          </div>
        ))}
      </div>

      {/* Floating hearts */}
      {hearts.map(h => <FloatingHeart key={h.id} x={h.x} y={h.y} />)}

      {/* Right action panel */}
      <div style={{ position: 'absolute', right: 10, bottom: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10 }}>
        <button type="button" aria-label="Curtir" onClick={handleLike} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <TKHeart filled={liked} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>{formatCount(likes)}</span>
        </button>
        <button type="button" aria-label="Presentear" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <TKGift />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Presente</span>
        </button>
        <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <TKShare />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Enviar</span>
        </button>
      </div>

      {/* Bottom input */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 10px 14px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <div style={{ flex: 1, height: 38, borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>{displayCaption || 'Adicione um comentário…'}</span>
        </div>
        <button type="button" aria-label="Enviar" style={{ width: 38, height: 38, borderRadius: '50%', background: '#FE2C55', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  );
};
