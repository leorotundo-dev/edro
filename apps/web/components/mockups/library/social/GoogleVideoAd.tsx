import React from 'react';

interface GoogleVideoAdProps {
  thumbnail?: string;
  image?: string;
  postImage?: string;
  headline?: string;
  title?: string;
  name?: string;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  ctaText?: string;
  duration?: string;
}

export const GoogleVideoAd: React.FC<GoogleVideoAdProps> = ({
  thumbnail,
  image,
  postImage,
  headline,
  title,
  name,
  description,
  text,
  body,
  caption,
  ctaText = 'Assistir agora',
  duration = '0:15',
}) => {
  const displayImage = thumbnail || image || postImage || '';
  const displayHeadline = headline || title || name || 'Título do vídeo';
  const displayDesc = description || text || body || caption || 'Descrição do anúncio em vídeo';

  return (
    <div style={{ width: 400, maxWidth: '100%', background: '#fff', border: '1px solid #DADCE0', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
      {/* Video area */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#202124', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt="Vídeo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} />
        )}
        {/* Play button */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.92)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#202124"><path d="M8 5v14l11-7z" /></svg>
          </div>
        </div>
        {/* Ad badge */}
        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.65)', color: 'white', fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 3 }}>
          Anúncio · {duration}
        </div>
      </div>
      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <h4 style={{ fontWeight: 600, fontSize: 15, color: '#202124', margin: '0 0 4px', lineHeight: '20px' }}>{displayHeadline}</h4>
        <p style={{ fontSize: 13, color: '#5F6368', margin: '0 0 14px', lineHeight: '18px' }}>{displayDesc}</p>
        <button type="button" style={{ width: '100%', background: '#1A73E8', border: 'none', borderRadius: 4, color: 'white', fontWeight: 600, fontSize: 14, padding: '10px 0', cursor: 'pointer' }}>
          {ctaText}
        </button>
      </div>
    </div>
  );
};
