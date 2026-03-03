import React, { useState } from 'react';

interface FacebookCarouselProps {
  brandName?: string;
  name?: string;
  username?: string;
  brandLogo?: string;
  profileImage?: string;
  carouselImages?: string[];
  slides?: string[];
  headline?: string;
  description?: string;
  body?: string;
  text?: string;
  caption?: string;
  ctaText?: string;
  arteBgColor?: string;
}

export const FacebookCarousel: React.FC<FacebookCarouselProps> = ({
  brandName,
  name,
  username,
  brandLogo,
  profileImage,
  carouselImages,
  slides,
  headline = 'Deslize para ver mais',
  description,
  body,
  text,
  caption,
  ctaText = 'Comprar agora',
  arteBgColor,
}) => {
  const [current, setCurrent] = useState(0);
  const displayName = name || brandName || username || 'Marca';
  const displayLogo = brandLogo || profileImage || '';
  const allSlides = carouselImages || slides || ['', '', ''];
  const total = allSlides.length;
  const displayDesc = description || body || text || caption || '';
  const accentColor = arteBgColor || '#1877F2';

  return (
    <div style={{ width: 500, maxWidth: '100%', background: '#fff', border: '1px solid #E4E6EB', borderRadius: 8, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#050505' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#E4E6EB', flexShrink: 0 }}>
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${accentColor} 0%, #0052cc 100%)` }} />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, margin: 0, lineHeight: '20px' }}>{displayName}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 12, color: '#65676B' }}>Patrocinado</span>
              <span style={{ fontSize: 12, color: '#65676B' }}>·</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#65676B"><path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 11.24A5.6 5.6 0 0 1 8 12.5a5.6 5.6 0 0 1-3.5-1.26c.24-1.11 1.13-1.94 2.44-1.94h2.12c1.31 0 2.2.83 2.44 1.94zM5 7.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0z" /></svg>
            </div>
          </div>
        </div>
        <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: '#65676B', borderRadius: '50%' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
      </div>

      {/* Carousel */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden', background: '#E4E6EB' }}>
        {/* Slides strip */}
        <div style={{ display: 'flex', transition: 'transform 0.25s ease', transform: `translateX(-${current * 100}%)` }}>
          {allSlides.map((img, i) => (
            <div key={i} style={{ minWidth: '100%', aspectRatio: '1/1', flexShrink: 0, background: '#E4E6EB', position: 'relative' }}>
              {img ? (
                <img src={img} alt={`Slide ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 16l5-5 4 4 3-3 4 4" /><circle cx="8.5" cy="8.5" r="1.5" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prev */}
        {current > 0 && (
          <button type="button" aria-label="Anterior" onClick={() => setCurrent(p => p - 1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {/* Next */}
        {current < total - 1 && (
          <button type="button" aria-label="Próximo" onClick={() => setCurrent(p => p + 1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}

        {/* Dot indicators */}
        {total > 1 && (
          <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
            {allSlides.map((_, i) => (
              <button key={i} type="button" aria-label={`Slide ${i + 1}`} onClick={() => setCurrent(i)} style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', padding: 0, cursor: 'pointer', background: i === current ? 'white' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </div>
        )}

        {/* Slide counter badge */}
        {total > 1 && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.65)', borderRadius: 100, padding: '3px 8px' }}>
            <span style={{ color: '#fff', fontSize: 12 }}>{current + 1}/{total}</span>
          </div>
        )}
      </div>

      {/* CTA row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F0F2F5', borderTop: '1px solid #E4E6EB' }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 2px', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</p>
          {displayDesc ? <p style={{ fontSize: 13, color: '#65676B', margin: 0, lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</p> : null}
        </div>
        <button type="button" style={{ background: '#E4E6EB', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#050505', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {ctaText}
        </button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px', borderTop: '1px solid #E4E6EB' }}>
        {[
          { label: 'Curtir', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M4 8.5v9H1.5v-9H4zm13 1.5c0 .7-.4 1.3-.9 1.6.4.3.7.8.7 1.4 0 .5-.2 1-.6 1.3.3.3.5.7.5 1.2 0 .5-.2 1-.6 1.3.3.3.5.8.5 1.2 0 1-.8 1.5-1.8 1.5H9.5c-1 0-1.8-.8-1.8-1.8V9.5c0-.7.4-1.3 1-1.6C9 7.3 9.5 6.2 9.5 5c0-1 .8-1.5 1.8-1.5s1.8.8 1.8 1.5c0 1-.4 1.9-1.1 2.5H15c1 0 2 .9 2 2z" /></svg> },
          { label: 'Comentar', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2C5.6 2 2 5.2 2 9.2c0 2.3 1.2 4.4 3.2 5.7V18l2.9-1.6c1.2.3 2.5.5 3.9.5 4.4 0 8-3.2 8-7.2S14.4 2 10 2zm0 13c-1.1 0-2.2-.2-3.2-.6l-.4-.2-2 .8.6-2-.3-.5C3.5 11.3 2.8 9.9 2.8 8.4c0-3.1 3.2-5.6 7.2-5.6s7.2 2.5 7.2 5.6-3.2 5.6-7.2 5.6z" /></svg> },
          { label: 'Compartilhar', icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M16 12l-6-6v4c-5.5 0-8 3.5-9 8 2-2.5 5-3 9-3v4l6-6z" /></svg> },
        ].map(({ label, icon }) => (
          <button key={label} type="button" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#65676B', padding: '8px 4px', fontSize: 14, fontWeight: 600, borderRadius: 4 }}>
            {icon}{label}
          </button>
        ))}
      </div>
    </div>
  );
};
