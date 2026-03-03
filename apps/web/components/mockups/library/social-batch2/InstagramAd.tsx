import React, { useState } from 'react';

interface InstagramAdProps {
  brandName?: string;
  name?: string;
  username?: string;
  brandLogo?: string;
  profileImage?: string;
  adImage?: string;
  image?: string;
  postImage?: string;
  headline?: string;
  arteHeadline?: string;
  description?: string;
  body?: string;
  arteBody?: string;
  text?: string;
  caption?: string;
  ctaText?: string;
  arteBgColor?: string;
  likes?: number | string;
}

const IGHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? '#ED4956' : 'none'} stroke={filled ? '#ED4956' : '#262626'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);
const IGComment = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" />
  </svg>
);
const IGSend = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const IGBookmark = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const InstagramAd: React.FC<InstagramAdProps> = ({
  brandName,
  name,
  username,
  brandLogo,
  profileImage,
  adImage,
  image,
  postImage,
  headline,
  arteHeadline,
  description,
  body,
  arteBody,
  text,
  caption,
  ctaText = 'Saiba mais',
  arteBgColor,
  likes = 1842,
}) => {
  const [liked, setLiked] = useState(false);
  const displayName = name || brandName || username || 'marca';
  const displayLogo = brandLogo || profileImage || '';
  const displayImage = adImage || image || postImage || '';
  const resolvedHeadline = arteHeadline || headline;
  const resolvedBody = arteBody || body;
  const displayCaption = caption || description || text || '';
  const accentColor = arteBgColor || '#E1306C';
  const likesLabel = (typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes).toLocaleString('pt-BR');

  return (
    <div style={{ width: 375, background: '#fff', fontFamily: '"SF Pro Text", -apple-system, sans-serif', color: '#262626' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ borderRadius: '50%', padding: 2, background: arteBgColor ? `linear-gradient(45deg, ${accentColor}, ${accentColor}bb)` : 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: '#e2e8f0' }}>
              {displayLogo ? <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: 14, display: 'block', lineHeight: '18px' }}>{displayName}</span>
            <span style={{ fontSize: 12, color: '#8E8E8E' }}>Patrocinado</span>
          </div>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#262626">
          <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
        </svg>
      </div>

      {/* Media */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#efefef', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : resolvedHeadline ? (
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #0f172a 0%, ${accentColor}44 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px', textAlign: 'center' }}>
            <div style={{ width: 36, height: 3, borderRadius: 2, background: accentColor, marginBottom: 14 }} />
            <p style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 8px', textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{resolvedHeadline}</p>
            {resolvedBody && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', margin: 0, lineHeight: 1.5 }}>{resolvedBody}</p>}
          </div>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 16l5-5 4 4 3-3 4 4" /><circle cx="8.5" cy="8.5" r="1.5" />
            </svg>
          </div>
        )}
      </div>

      {/* CTA strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #DBDBDB', background: '#FAFAFA' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolvedHeadline || displayName}</p>
        </div>
        <button type="button" style={{ background: 'none', border: '1.5px solid #DBDBDB', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#262626', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {ctaText}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 4px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <IGHeart filled={liked} />
          </button>
          <IGComment /><IGSend />
        </div>
        <IGBookmark />
      </div>

      {/* Likes */}
      <div style={{ padding: '2px 12px 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{likesLabel} curtidas</span>
      </div>

      {/* Caption */}
      {displayCaption ? (
        <div style={{ padding: '2px 12px 10px', fontSize: 14, lineHeight: '18px', color: '#262626' }}>
          <span style={{ fontWeight: 600, marginRight: 4 }}>{displayName}</span>{displayCaption}
        </div>
      ) : null}
    </div>
  );
};
