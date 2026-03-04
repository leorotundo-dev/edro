'use client';

import React, { useState } from 'react';

interface LinkedInAdProps {
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

export const LinkedInAd: React.FC<LinkedInAdProps> = ({
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
  brandColor = '#0077b5',
  brandName,
}) => {
  const [followed, setFollowed] = useState(false);
  const [ctaClicked, setCtaClicked] = useState(false);

  const resolvedCompany = brandName ?? name ?? username ?? 'Empresa Patrocinadora';
  const resolvedHeadline = headline ?? title ?? 'Solução que transforma o seu negócio';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Descubra como líderes do mercado estão usando nossa plataforma para acelerar resultados e escalar operações com eficiência.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';

  return (
    <div style={{
      width: 420,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.08)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: 'hidden',
      color: '#000',
    }}>
      <style>{`
        @keyframes li-ad-pop { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
        .li-ad-cta:hover { filter: brightness(0.88); }
        .li-ad-follow:hover { opacity: 0.85; }
        .li-ad-action:hover { background: #f3f2ef !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 6,
            background: resolvedAvatar ? 'transparent' : brandColor,
            overflow: 'hidden',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {resolvedAvatar
              ? <img src={resolvedAvatar} alt={resolvedCompany} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 700, fontSize: 20 }}>{resolvedCompany.charAt(0)}</span>
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#000', lineHeight: 1.3 }}>{resolvedCompany}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{
                display: 'inline-block',
                background: '#f3f6f8',
                border: '1px solid #c8d6df',
                borderRadius: 3,
                padding: '1px 5px',
                fontSize: 11,
                color: '#5e5e5e',
              }}>Promovido</span>
              <span>· Patrocinado</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            aria-label="Seguir empresa"
            className="li-ad-follow"
            onClick={() => setFollowed(f => !f)}
            style={{
              border: `1px solid ${followed ? brandColor : '#0077b5'}`,
              borderRadius: 16,
              background: followed ? brandColor : 'transparent',
              color: followed ? '#fff' : '#0077b5',
              fontSize: 13,
              fontWeight: 600,
              padding: '4px 14px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {followed ? '+ Seguindo' : '+ Seguir'}
          </button>
          <button
            type="button"
            aria-label="Mais opções do anúncio"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#888"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
          </button>
        </div>
      </div>

      {/* Body text */}
      <div style={{ padding: '0 16px 12px', fontSize: 14, color: '#1d1d1d', lineHeight: 1.55 }}>
        {resolvedBody}
      </div>

      {/* Ad image */}
      <div style={{
        width: '100%',
        height: 218,
        background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}66 100%)`,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {resolvedImage
          ? <img src={resolvedImage} alt="Imagem do anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span style={{ color: brandColor, fontWeight: 600, fontSize: 14 }}>{resolvedHeadline}</span>
            </div>
          )
        }
      </div>

      {/* CTA Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#f3f6f8',
        borderTop: '1px solid #e0dfdc',
      }}>
        <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#000', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{resolvedHeadline}</div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{resolvedCompany.toLowerCase().replace(/\s+/g, '')}.com.br</div>
        </div>
        <button
          type="button"
          aria-label="Saiba mais sobre o anúncio"
          className="li-ad-cta"
          onClick={() => setCtaClicked(true)}
          style={{
            background: ctaClicked ? '#005582' : '#0077b5',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
            flexShrink: 0,
          }}
        >
          {ctaClicked ? 'Acessado ✓' : 'Saiba mais'}
        </button>
      </div>

      {/* Engagement bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px 4px', borderTop: '1px solid #e0dfdc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 13 }}>👍❤️</span>
          <span style={{ fontSize: 12, color: '#666' }}>1.247 reações</span>
        </div>
        <span style={{ fontSize: 12, color: '#666' }}>34 comentários</span>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #e0dfdc', padding: '2px 8px 6px' }}>
        {[
          { label: 'Curtir', icon: 'M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3' },
          { label: 'Comentar', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
          { label: 'Compartilhar', icon: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13' },
          { label: 'Enviar', icon: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
        ].map(a => (
          <button
            key={a.label}
            type="button"
            aria-label={a.label}
            className="li-ad-action"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 4, color: '#666', fontSize: 12, fontWeight: 600, transition: 'background 0.12s' }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.8"><path d={a.icon}/></svg>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
};
