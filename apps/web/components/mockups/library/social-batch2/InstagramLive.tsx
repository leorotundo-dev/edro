import React, { useState } from 'react';

interface InstagramLiveProps {
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

const IGLiveHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={filled ? '#ED4956' : 'none'} stroke={filled ? '#ED4956' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);

const IGLiveShare = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export const InstagramLive: React.FC<InstagramLiveProps> = ({
  username = 'username',
  name,
  profileImage = '',
  liveImage,
  image,
  storyImage,
  viewers = '1,2K',
  likes = '5,4K',
  caption,
  description,
  text,
}) => {
  const [liked, setLiked] = useState(false);
  const displayUser = name || username;
  const normalizedUser = displayUser.startsWith('@') ? displayUser : `@${displayUser}`;
  const media = liveImage || storyImage || image || '';
  const displayCaption = caption || description || text || '';

  return (
    <div style={{ position: 'relative', width: 320, height: 568, background: '#000', borderRadius: 16, overflow: 'hidden', fontFamily: '"SF Pro Text", -apple-system, sans-serif', color: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

      {/* Background */}
      {media ? (
        <img src={media} alt="Live" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)' }} />
      )}

      {/* Gradient overlays */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 220, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 12px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* AO VIVO badge */}
          <div style={{ background: 'linear-gradient(90deg, #833ab4, #fd1d1d)', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5 }}>AO VIVO</span>
          </div>
          {/* Viewers */}
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 12, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 14.5v-9l7 4.5-7 4.5z" /></svg>
            <span style={{ fontSize: 11, fontWeight: 600 }}>{formatCount(viewers)}</span>
          </div>
        </div>
        {/* Close */}
        <button type="button" aria-label="Fechar" style={{ background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Chat messages */}
      <div style={{ position: 'absolute', left: 12, right: 56, bottom: 88, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10 }}>
        {[
          { user: 'ana.costa', msg: '❤️ Que lindo!', color: '#C13584' },
          { user: 'pedro_mr', msg: 'Primeiro aqui! 🔥', color: '#E1306C' },
          { user: 'carol.lima', msg: 'Te amo demais 😍', color: '#833AB4' },
        ].map(({ user, msg, color }) => (
          <div key={user} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(0,0,0,0.45)', borderRadius: 16, padding: '4px 10px', maxWidth: '100%' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color, flexShrink: 0 }}>{user}</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg}</span>
          </div>
        ))}
      </div>

      {/* Right action panel */}
      <div style={{ position: 'absolute', right: 10, bottom: 88, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10 }}>
        <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <IGLiveHeart filled={liked} />
          <span style={{ fontSize: 11, fontWeight: 700 }}>{formatCount(likes)}</span>
        </button>
        <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <IGLiveShare />
          <span style={{ fontSize: 11, fontWeight: 700 }}>Enviar</span>
        </button>
      </div>

      {/* Avatar + username + follow */}
      <div style={{ position: 'absolute', bottom: 46, left: 12, right: 52, display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid white', background: '#333', flexShrink: 0 }}>
          {profileImage ? <img src={profileImage} alt={normalizedUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #833ab4, #fd1d1d)' }} />}
        </div>
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{normalizedUser}</span>
        <button type="button" style={{ background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.7)', borderRadius: 6, padding: '4px 12px', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
          Seguir
        </button>
      </div>

      {/* Bottom input */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px 12px', display: 'flex', alignItems: 'center', gap: 8, zIndex: 10 }}>
        <div style={{ flex: 1, height: 36, borderRadius: 20, border: '1.5px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', padding: '0 14px' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>{displayCaption || 'Comente…'}</span>
        </div>
      </div>
    </div>
  );
};
