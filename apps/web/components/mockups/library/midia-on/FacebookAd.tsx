'use client';

import React, { useState } from 'react';

interface FacebookAdProps {
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

export const FacebookAd: React.FC<FacebookAdProps> = ({
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
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(142);
  const [saved, setSaved] = useState(false);

  const resolvedBrand = brandName ?? name ?? username ?? 'Marca Patrocinada';
  const resolvedHeadline = headline ?? title ?? 'Oferta Imperdível — Aproveite Agora';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Descubra produtos incríveis com os melhores preços do mercado. Qualidade garantida e entrega rápida para todo o Brasil.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  const handleLike = () => {
    setLiked((prev) => !prev);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
  };

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
        @keyframes fb-ad-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
        .fb-ad-root { animation: fb-ad-fadein 0.3s ease; }
        .fb-ad-like-btn:hover { background: #e7f3ff !important; }
        .fb-ad-action-btn:hover { background: #f0f2f5 !important; }
        .fb-ad-cta-btn:hover { filter: brightness(0.90); }
        .fb-ad-save-btn:hover { background: #f0f2f5 !important; }
        .fb-ad-opts-btn:hover { background: #f0f2f5 !important; }
      `}</style>

      <div className="fb-ad-root">
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
              <div style={{ fontSize: 14, fontWeight: 600, color: '#050505', lineHeight: 1.3 }}>{resolvedBrand}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span style={{
                  fontSize: 11, color: '#fff', background: '#65676b',
                  borderRadius: 3, padding: '1px 5px', fontWeight: 600, letterSpacing: 0.2,
                }}>Patrocinado</span>
                <span style={{ fontSize: 11, color: '#65676b' }}>·</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="#65676b">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <button
              type="button"
              aria-label="Salvar anúncio"
              className="fb-ad-save-btn"
              onClick={() => setSaved((p) => !p)}
              style={{
                background: 'none', border: 'none', borderRadius: 6,
                padding: '5px 8px', cursor: 'pointer',
                color: saved ? resolvedColor : '#65676b', fontSize: 12, fontWeight: 600,
              }}
            >
              {saved ? '✓ Salvo' : '+ Salvar'}
            </button>
            <button
              type="button"
              aria-label="Opções do anúncio"
              className="fb-ad-opts-btn"
              style={{
                background: 'none', border: 'none', borderRadius: 6,
                padding: '5px 8px', cursor: 'pointer', color: '#65676b',
                fontSize: 20, lineHeight: 1, letterSpacing: 1,
              }}
            >
              ···
            </button>
          </div>
        </div>

        {/* Body text */}
        <div style={{ padding: '0 16px 12px', fontSize: 15, color: '#050505', lineHeight: 1.5 }}>
          {resolvedBody}
        </div>

        {/* Post image */}
        <div style={{
          width: '100%', height: 280, overflow: 'hidden',
          background: resolvedImage ? 'transparent' : 'linear-gradient(135deg, #e7f3ff 0%, #cce0ff 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {resolvedImage
            ? <img src={resolvedImage} alt={resolvedHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#90b8f8" strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )
          }
        </div>

        {/* CTA strip */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', background: '#f0f2f5', borderBottom: '1px solid #e4e6eb',
        }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ fontSize: 11, color: '#65676b', marginBottom: 2 }}>minhalojaonline.com.br</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#050505', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolvedHeadline}</div>
            <div style={{ fontSize: 13, color: '#65676b', marginTop: 1 }}>A partir de R$ 49,90 — Frete grátis</div>
          </div>
          <button
            type="button"
            aria-label="Comprar agora"
            className="fb-ad-cta-btn"
            style={{
              background: resolvedColor, color: '#fff', border: 'none',
              borderRadius: 6, padding: '9px 16px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'filter 0.15s',
            }}
          >
            Comprar agora
          </button>
        </div>

        {/* Reaction count row */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ display: 'flex' }}>
              {['#1877f2', '#f5533d', '#f7b928'].map((c, i) => (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: '50%', background: c,
                  border: '2px solid #fff', marginLeft: i > 0 ? -5 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                }}>
                  {i === 0 && '👍'}{i === 1 && '❤️'}{i === 2 && '😮'}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#65676b' }}>{likeCount.toLocaleString('pt-BR')}</span>
          </div>
          <span style={{ fontSize: 13, color: '#65676b' }}>24 comentários · 8 compartilhamentos</span>
        </div>

        {/* Action buttons row */}
        <div style={{ borderTop: '1px solid #e4e6eb', margin: '0 16px', display: 'flex' }}>
          <button
            type="button"
            aria-label="Curtir publicação"
            className="fb-ad-like-btn"
            onClick={handleLike}
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none', borderRadius: 6,
              color: liked ? resolvedColor : '#65676b', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            👍 Curtir
          </button>
          <button
            type="button"
            aria-label="Comentar publicação"
            className="fb-ad-action-btn"
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none', borderRadius: 6,
              color: '#65676b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            💬 Comentar
          </button>
          <button
            type="button"
            aria-label="Compartilhar publicação"
            className="fb-ad-action-btn"
            style={{
              flex: 1, padding: '9px 0', background: 'none', border: 'none', borderRadius: 6,
              color: '#65676b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
            }}
          >
            ↗ Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};
