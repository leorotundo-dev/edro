import React, { useState } from 'react';

interface InstagramReelProps {
  username?: string;
  name?: string;
  profileImage?: string;
  reelImage?: string;
  image?: string;
  storyImage?: string;
  thumbnail?: string;
  caption?: string;
  description?: string;
  text?: string;
  headline?: string;
  arteHeadline?: string;
  body?: string;
  arteBody?: string;
  arteBgColor?: string;
  likes?: string | number;
  comments?: string | number;
  audioName?: string;
  soundName?: string;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function renderHashtags(text: string) {
  return text.split(/((?:#|@)[\w\u00C0-\u017F]+)/g).map((part, i) =>
    part.startsWith('#') || part.startsWith('@') ? (
      <span key={i} style={{ fontWeight: 600 }}>{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

const IGHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? '#FE3B5B' : 'none'} stroke={filled ? '#FE3B5B' : 'white'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);
const IGComment = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);
const IGSend = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IGBookmark = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const InstagramReel: React.FC<InstagramReelProps> = ({
  username = 'username', name, profileImage = '',
  reelImage, image, storyImage, thumbnail,
  caption, description, text,
  headline, arteHeadline, body, arteBody, arteBgColor,
  likes = '12.4K', comments = '234',
  audioName, soundName,
}) => {
  const [liked, setLiked] = useState(false);
  const displayUsername = name || username;
  const media = reelImage || storyImage || image || thumbnail || '';
  const displayCaption = caption || description || text || '';
  const resolvedHeadline = arteHeadline || headline;
  const resolvedBody = arteBody || body;
  const accentColor = arteBgColor || '#E1306C';
  const sound = audioName || soundName || `Som original · ${displayUsername}`;
  const likesLabel = formatCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);

  return (
    <div style={{ position: 'relative', width: 320, height: 568, background: '#000', borderRadius: 16, overflow: 'hidden', fontFamily: '"SF Pro Text", -apple-system, sans-serif', color: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>
      {/* Background */}
      {media ? (
        <img src={media} alt="Reel" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : resolvedHeadline ? (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #0f172a 0%, ${accentColor}44 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 28px 120px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 3, borderRadius: 2, background: accentColor, marginBottom: 16 }} />
          <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, margin: '0 0 10px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{resolvedHeadline}</p>
          {resolvedBody && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{resolvedBody}</p>}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Reels 9:16</span>
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 40%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>Reels</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>

      {/* Right panel */}
      <div style={{ position: 'absolute', right: 10, bottom: 92, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, zIndex: 10 }}>
        <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <IGHeart filled={liked} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{likesLabel}</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <IGComment />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{formatCount(comments)}</span>
        </div>
        <IGSend />
        <IGBookmark />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" /></svg>
        {/* Audio disc */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: profileImage ? `url(${profileImage}) center/cover` : 'linear-gradient(135deg,#1a1a1a,#444)', border: '3px solid rgba(255,255,255,0.2)', boxShadow: '0 0 0 8px rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.9)' }} />
        </div>
      </div>

      {/* Bottom-left */}
      <div style={{ position: 'absolute', left: 12, right: 62, bottom: 12, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: '2px solid white', background: '#444', flexShrink: 0 }}>
            {profileImage ? <img src={profileImage} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: accentColor }} />}
          </div>
          <span style={{ fontWeight: 700, fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{displayUsername}</span>
          <div style={{ border: '1px solid rgba(255,255,255,0.8)', borderRadius: 4, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>Seguir</div>
        </div>
        {displayCaption ? (
          <p style={{ fontSize: 13, lineHeight: 1.4, margin: '0 0 8px', textShadow: '0 1px 3px rgba(0,0,0,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {renderHashtags(displayCaption)}
          </p>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)' }}>{sound}</span>
        </div>
      </div>
    </div>
  );
};
