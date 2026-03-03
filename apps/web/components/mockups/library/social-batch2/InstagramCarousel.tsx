import React, { useState } from 'react';

interface InstagramCarouselProps {
  username?: string;
  name?: string;
  profileImage?: string;
  carouselImages?: string[];
  slides?: string[];
  postImage?: string;
  image?: string;
  caption?: string;
  description?: string;
  text?: string;
  likes?: number | string;
  arteBgColor?: string;
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

function renderCaption(username: string, text: string) {
  if (!text) return null;
  const parts = text.split(/((?:#|@)[\w\u00C0-\u017F]+)/g);
  return (
    <div style={{ fontSize: 14, lineHeight: '18px', color: '#262626' }}>
      <span style={{ fontWeight: 600, marginRight: 4 }}>{username}</span>
      {parts.map((part, i) =>
        part.startsWith('#') || part.startsWith('@') ? (
          <span key={i} style={{ color: '#00376B' }}>{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </div>
  );
}

export const InstagramCarousel: React.FC<InstagramCarouselProps> = ({
  username = 'username',
  name,
  profileImage = '',
  carouselImages,
  slides,
  postImage,
  image,
  caption,
  description,
  text,
  likes = 1234,
  arteBgColor,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [liked, setLiked] = useState(false);

  const displayUsername = name || username;
  const displayCaption = caption || description || text || '';
  const allSlides = carouselImages || slides || (postImage || image ? [postImage || image || ''] : ['', '', '']);
  const total = allSlides.length;
  const likesLabel = (typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes).toLocaleString('pt-BR');

  return (
    <div style={{ width: 375, background: '#fff', fontFamily: '"SF Pro Text", -apple-system, sans-serif', color: '#262626', borderRadius: 0 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            borderRadius: '50%', padding: 2, flexShrink: 0,
            background: arteBgColor
              ? `linear-gradient(45deg, ${arteBgColor}, ${arteBgColor}bb)`
              : 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid white', overflow: 'hidden', background: '#e2e8f0' }}>
              {profileImage ? <img src={profileImage} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
          </div>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{displayUsername}</span>
        </div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#262626">
          <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
        </svg>
      </div>

      {/* ── Carousel area ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#efefef', overflow: 'hidden' }}>
        {allSlides[currentSlide] ? (
          <img src={allSlides[currentSlide]} alt={`Slide ${currentSlide + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159" />
              <path d="M15.75 13.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909" />
              <circle cx="8.5" cy="8.5" r="1" />
            </svg>
          </div>
        )}

        {/* Prev arrow */}
        {currentSlide > 0 && (
          <button type="button" aria-label="Anterior" onClick={() => setCurrentSlide(p => p - 1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {/* Next arrow */}
        {currentSlide < total - 1 && (
          <button type="button" aria-label="Próximo" onClick={() => setCurrentSlide(p => p + 1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}

        {/* Slide counter badge */}
        {total > 1 && (
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(18,18,18,0.70)', borderRadius: 100, padding: '3px 8px' }}>
            <span style={{ color: '#F9F9F9', fontSize: 12 }}>{currentSlide + 1}/{total}</span>
          </div>
        )}
      </div>

      {/* ── Dot indicators ── */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '8px 0 4px' }}>
          {allSlides.map((_, i) => (
            <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => setCurrentSlide(i)} style={{ width: 6, height: 6, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === currentSlide ? '#3897F0' : 'rgba(0,0,0,0.15)' }} />
          ))}
        </div>
      )}

      {/* ── Action bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px 4px' }}>
        <div style={{ display: 'flex', gap: 14 }}>
          <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <IGHeart filled={liked} />
          </button>
          <IGComment />
          <IGSend />
        </div>
        <IGBookmark />
      </div>

      {/* ── Likes ── */}
      <div style={{ padding: '2px 12px 4px' }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{likesLabel} curtidas</span>
      </div>

      {/* ── Caption ── */}
      {displayCaption ? (
        <div style={{ padding: '2px 12px 8px' }}>
          {renderCaption(displayUsername, displayCaption)}
        </div>
      ) : null}
    </div>
  );
};
