'use client';

import React, { useState } from 'react';

interface FacebookCarouselProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

const CARDS = [
  { label: 'Produto 01', price: 'R$ 89,90', color: '#e7f3ff' },
  { label: 'Produto 02', price: 'R$ 129,90', color: '#fff0e7' },
  { label: 'Produto 03', price: 'R$ 59,90', color: '#e7ffe9' },
  { label: 'Produto 04', price: 'R$ 199,00', color: '#f7e7ff' },
];

export const FacebookCarousel: React.FC<FacebookCarouselProps> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  brandName,
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const [liked, setLiked] = useState(false);

  const resolvedBrand = brandName ?? name ?? username ?? 'Marca Patrocinada';
  const resolvedHeadline = headline ?? title ?? 'Confira nossa coleção completa';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Deslize para ver mais produtos incríveis com preços especiais.';
  const resolvedAvatar = profileImage ?? '';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  const goNext = () => setActiveCard((p) => Math.min(p + 1, CARDS.length - 1));
  const goPrev = () => setActiveCard((p) => Math.max(p - 1, 0));

  return (
    <div style={{
      width: 500,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fb-car-slide { from { opacity:0; transform:translateX(10px); } to { opacity:1; transform:none; } }
        .fb-car-card-anim { animation: fb-car-slide 0.22s ease; }
        .fb-car-arrow:hover { background: rgba(0,0,0,0.08) !important; }
        .fb-car-action:hover { background: #f0f2f5 !important; }
        .fb-car-cta:hover { filter: brightness(0.88); }
        .fb-car-dot { transition: all 0.2s; cursor: pointer; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: resolvedAvatar ? 'transparent' : resolvedColor,
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {resolvedAvatar
              ? <img src={resolvedAvatar} alt={resolvedBrand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{resolvedBrand.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#050505' }}>{resolvedBrand}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: '#fff', background: '#65676b', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>Patrocinado</span>
              <span style={{ fontSize: 11, color: '#65676b' }}>· 🌐</span>
            </div>
          </div>
        </div>
        <button type="button" aria-label="Opções" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676b', fontSize: 20, letterSpacing: 1 }}>···</button>
      </div>

      {/* Body text */}
      <div style={{ padding: '0 16px 10px', fontSize: 15, color: '#050505', lineHeight: 1.45 }}>
        {resolvedBody}
      </div>

      {/* Carousel area */}
      <div style={{ position: 'relative', overflow: 'hidden', borderTop: '1px solid #e4e6eb', borderBottom: '1px solid #e4e6eb' }}>
        <div style={{ display: 'flex', overflowX: 'hidden' }}>
          <div
            className="fb-car-card-anim"
            key={activeCard}
            style={{
              display: 'flex',
              width: '100%',
              flexShrink: 0,
            }}
          >
            {/* Active card */}
            <div style={{ width: '75%', flexShrink: 0 }}>
              <div style={{
                width: '100%',
                height: 240,
                background: resolvedImage ? 'transparent' : CARDS[activeCard].color,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {resolvedImage
                  ? <img src={resolvedImage} alt={CARDS[activeCard].label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div style={{ textAlign: 'center' }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={resolvedColor} strokeWidth="1.4" style={{ opacity: 0.5 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )
                }
              </div>
              <div style={{ padding: '10px 12px', background: '#f0f2f5', borderRight: '1px solid #e4e6eb' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#050505', marginBottom: 2 }}>{CARDS[activeCard].label}</div>
                <div style={{ fontSize: 13, color: '#65676b', marginBottom: 8 }}>{CARDS[activeCard].price}</div>
                <button
                  type="button"
                  aria-label={`Comprar ${CARDS[activeCard].label}`}
                  className="fb-car-cta"
                  style={{
                    width: '100%', background: resolvedColor, color: '#fff',
                    border: 'none', borderRadius: 6, padding: '7px 0',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'filter 0.15s',
                  }}
                >
                  Comprar agora
                </button>
              </div>
            </div>

            {/* Peek of next card */}
            <div style={{ width: '25%', flexShrink: 0, opacity: 0.6 }}>
              <div style={{
                width: '100%', height: 240,
                background: CARDS[(activeCard + 1) % CARDS.length].color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.4">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <div style={{ padding: '10px 10px', background: '#f0f2f5' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#65676b' }}>{CARDS[(activeCard + 1) % CARDS.length].label}</div>
                <div style={{ fontSize: 12, color: '#aaa' }}>{CARDS[(activeCard + 1) % CARDS.length].price}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Left arrow */}
        {activeCard > 0 && (
          <button
            type="button"
            aria-label="Card anterior"
            className="fb-car-arrow"
            onClick={goPrev}
            style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-100%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)', border: '1px solid #e4e6eb',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10, transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
        )}
        {/* Right arrow */}
        {activeCard < CARDS.length - 1 && (
          <button
            type="button"
            aria-label="Próximo card"
            className="fb-car-arrow"
            onClick={goNext}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-100%)',
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.92)', border: '1px solid #e4e6eb',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', zIndex: 10, transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        )}
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '10px 0 6px' }}>
        {CARDS.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir para card ${i + 1}`}
            className="fb-car-dot"
            onClick={() => setActiveCard(i)}
            style={{
              width: i === activeCard ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i === activeCard ? resolvedColor : '#e4e6eb',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      {/* Headline beneath carousel */}
      <div style={{ padding: '4px 16px 10px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#050505' }}>{resolvedHeadline}</div>
        <div style={{ fontSize: 13, color: '#65676b', marginTop: 2 }}>Ver todos os {CARDS.length} produtos →</div>
      </div>

      {/* Reaction row */}
      <div style={{ padding: '2px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e4e6eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 13, color: '#65676b' }}>👍 ❤️ 318</span>
        </div>
        <span style={{ fontSize: 13, color: '#65676b' }}>12 comentários</span>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', borderTop: '1px solid #e4e6eb', margin: '0 16px' }}>
        {['👍 Curtir', '💬 Comentar', '↗ Compartilhar'].map((lbl, i) => (
          <button
            key={i}
            type="button"
            aria-label={lbl}
            className="fb-car-action"
            onClick={i === 0 ? () => setLiked((p) => !p) : undefined}
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none',
              borderRadius: 6, color: i === 0 && liked ? resolvedColor : '#65676b',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
};
