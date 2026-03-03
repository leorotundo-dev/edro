import React, { useState } from 'react';

interface FacebookAdProps {
  brandName?: string;
  name?: string;
  username?: string;
  brandLogo?: string;
  profileImage?: string;
  adImage?: string;
  image?: string;
  postImage?: string;
  headline?: string;
  description?: string;
  body?: string;
  text?: string;
  caption?: string;
  ctaText?: string;
  likes?: number | string;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} mil`;
  return String(n);
}

export const FacebookAd: React.FC<FacebookAdProps> = ({
  brandName,
  name,
  username,
  brandLogo,
  profileImage,
  adImage,
  image,
  postImage,
  headline = 'Confira nossa nova coleção',
  description,
  body,
  text,
  caption,
  ctaText = 'Saiba mais',
  likes = 248,
}) => {
  const [liked, setLiked] = useState(false);
  const displayName = name || brandName || username || 'Marca';
  const displayLogo = brandLogo || profileImage || '';
  const displayImage = adImage || image || postImage || '';
  const displayDesc = description || body || text || caption || 'Descubra produtos incríveis com condições especiais para você.';
  const likesLabel = formatCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);

  return (
    <div style={{ width: 500, maxWidth: '100%', background: '#fff', border: '1px solid #E4E6EB', borderRadius: 8, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#050505', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#E4E6EB', flexShrink: 0 }}>
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1877F2 0%, #0052cc 100%)' }} />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0, lineHeight: '20px' }}>{displayName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#65676B' }}>Patrocinado</span>
              <span style={{ fontSize: 12, color: '#65676B' }}>·</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#65676B">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 11.24A5.6 5.6 0 0 1 8 12.5a5.6 5.6 0 0 1-3.5-1.26c.24-1.11 1.13-1.94 2.44-1.94h2.12c1.31 0 2.2.83 2.44 1.94zM5 7.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" />
              </svg>
            </div>
          </div>
        </div>
        <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#65676B', borderRadius: '50%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Ad image */}
      <div style={{ width: '100%', background: '#E4E6EB' }}>
        {displayImage ? (
          <img src={displayImage} alt="Anúncio" style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 13, color: '#65676B' }}>Imagem do anúncio</span>
          </div>
        )}
      </div>

      {/* CTA row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 2px', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</p>
          <p style={{ fontSize: 13, color: '#65676B', margin: 0, lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</p>
        </div>
        <button type="button" style={{ background: '#E4E6EB', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#050505', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {ctaText}
        </button>
      </div>

      {/* Reactions counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 16px', borderBottom: '1px solid #E4E6EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'flex', gap: -2 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#1877F2', border: '1.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                <path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" />
              </svg>
            </div>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#F33E58', border: '1.5px solid white', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="white">
                <path d="M8 15.5l-1.4-1.3C3.2 11.2 1 9.2 1 6.5 1 4 3 2 5.5 2c1.4 0 2.8.7 3.5 1.8C9.7 2.7 11.1 2 12.5 2 15 2 17 4 17 6.5c0 2.7-2.2 4.7-5.6 7.7L8 15.5z" />
              </svg>
            </div>
          </div>
          <span style={{ fontSize: 13, color: '#65676B' }}>{likesLabel}</span>
        </div>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px' }}>
        {[
          {
            label: 'Curtir', active: liked,
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill={liked ? '#1877F2' : 'currentColor'}><path d="M4 8.5v9H1.5v-9H4zm13 1.5c0 .7-.4 1.3-.9 1.6.4.3.7.8.7 1.4 0 .5-.2 1-.6 1.3.3.3.5.7.5 1.2 0 .5-.2 1-.6 1.3.3.3.5.8.5 1.2 0 1-.8 1.5-1.8 1.5H9.5c-1 0-1.8-.8-1.8-1.8V9.5c0-.7.4-1.3 1-1.6C9 7.3 9.5 6.2 9.5 5c0-1 .8-1.5 1.8-1.5s1.8.8 1.8 1.5c0 1-.4 1.9-1.1 2.5H15c1 0 2 .9 2 2z" /></svg>,
            onClick: () => setLiked(p => !p),
          },
          {
            label: 'Comentar',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2C5.6 2 2 5.2 2 9.2c0 2.3 1.2 4.4 3.2 5.7V18l2.9-1.6c1.2.3 2.5.5 3.9.5 4.4 0 8-3.2 8-7.2S14.4 2 10 2zm0 13c-1.1 0-2.2-.2-3.2-.6l-.4-.2-2 .8.6-2-.3-.5C3.5 11.3 2.8 9.9 2.8 8.4c0-3.1 3.2-5.6 7.2-5.6s7.2 2.5 7.2 5.6-3.2 5.6-7.2 5.6z" /></svg>,
          },
          {
            label: 'Compartilhar',
            icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16 12l-6-6v4c-5.5 0-8 3.5-9 8 2-2.5 5-3 9-3v4l6-6z" /></svg>,
          },
        ].map(({ label, active, icon, onClick }) => (
          <button key={label} type="button" onClick={onClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: active ? '#1877F2' : '#65676B', padding: '8px 4px', fontSize: 14, fontWeight: 600, borderRadius: 4 }}>
            {icon}{label}
          </button>
        ))}
      </div>
    </div>
  );
};
