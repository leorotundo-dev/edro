import React, { useState } from 'react';

interface PinterestIdeaPinProps {
  pages?: string[];
  slides?: string[];
  carouselImages?: string[];
  image?: string;
  postImage?: string;
  title?: string;
  headline?: string;
  caption?: string;
  creatorName?: string;
  name?: string;
  username?: string;
  creatorImage?: string;
  profileImage?: string;
}

export const PinterestIdeaPin: React.FC<PinterestIdeaPinProps> = ({
  pages,
  slides,
  carouselImages,
  image,
  postImage,
  title,
  headline,
  caption,
  creatorName,
  name,
  username,
  creatorImage,
  profileImage,
}) => {
  const [current, setCurrent] = useState(0);
  const allPages = pages || slides || carouselImages || (image || postImage ? [image || postImage || ''] : ['', '', '']);
  const total = allPages.length;
  const displayTitle = title || headline || caption || 'Título da Ideia';
  const displayName = creatorName || name || username || 'Criador';
  const displayAvatar = creatorImage || profileImage || '';

  return (
    <div style={{ width: 300, maxWidth: '100%', background: '#fff', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Image area */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '9/16', background: '#E2E8F0', overflow: 'hidden' }}>
        {allPages[current] ? (
          <img src={allPages[current]} alt={`Página ${current + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #E60023 0%, #c8001f 100%)' }} />
        )}
        {/* Counter */}
        {total > 1 && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 12, padding: '3px 8px', borderRadius: 20 }}>
            {current + 1}/{total}
          </div>
        )}
        {/* Next button */}
        {current < total - 1 && (
          <button type="button" aria-label="Próxima" onClick={() => setCurrent(p => p + 1)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
        {/* Prev button */}
        {current > 0 && (
          <button type="button" aria-label="Anterior" onClick={() => setCurrent(p => p - 1)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, background: 'rgba(255,255,255,0.92)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
      </div>
      {/* Footer */}
      <div style={{ padding: '10px 12px 12px' }}>
        <h3 style={{ fontWeight: 600, fontSize: 14, color: '#111827', margin: '0 0 8px', lineHeight: '18px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{displayTitle}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E60023', overflow: 'hidden', flexShrink: 0 }}>
            {displayAvatar ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
          </div>
          <span style={{ fontSize: 12, color: '#6B7280' }}>{displayName}</span>
        </div>
      </div>
    </div>
  );
};
