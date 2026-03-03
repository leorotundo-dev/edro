'use client';
import React from 'react';

interface BannerHeroProps {
  title?: string;
  headline?: string;
  name?: string;
  brandName?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  caption?: string;
}

export const BannerHero: React.FC<BannerHeroProps> = ({
  title: titleProp,
  headline,
  name,
  brandName,
  subtitle,
  description,
  body,
  caption,
  image: imageProp,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#5D87FF',
}) => {
  const title = titleProp ?? headline ?? 'Novidade que vai mudar tudo';
  const brand = brandName ?? name ?? 'MINHA MARCA';
  const sub = subtitle ?? description ?? body ?? caption ?? 'Qualidade premium com o melhor preço do mercado. Não perca esta oportunidade exclusiva.';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  // Derive a darker shade of brandColor for gradient
  const hex = brandColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const darkerColor = `rgb(${Math.max(0, r - 50)}, ${Math.max(0, g - 50)}, ${Math.max(0, b - 60)})`;

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        width: '800px',
        height: '400px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        display: 'flex',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Left side — text content */}
      <div
        style={{
          width: '50%',
          background: `linear-gradient(135deg, ${darkerColor} 0%, ${brandColor} 60%, ${brandColor}cc 100%)`,
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1.5px solid rgba(255,255,255,0.4)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span
            style={{
              color: 'rgba(255,255,255,0.95)',
              fontWeight: 800,
              fontSize: '13px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            {brand}
          </span>
        </div>

        {/* Main headline */}
        <div>
          <h1
            style={{
              color: '#ffffff',
              fontSize: '30px',
              fontWeight: 900,
              lineHeight: 1.15,
              margin: '0 0 10px 0',
              textShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '13px',
              lineHeight: 1.55,
              margin: '0 0 20px 0',
            }}
          >
            {sub}
          </p>

          {/* CTA Button */}
          <button
            type="button"
            style={{
              background: '#ffffff',
              color: brandColor,
              border: 'none',
              borderRadius: '8px',
              padding: '11px 24px',
              fontSize: '13px',
              fontWeight: 800,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
            }}
          >
            Comprar Agora
          </button>
        </div>

        {/* Bottom stats strip */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            paddingTop: '14px',
            marginTop: '4px',
          }}
        >
          {[
            { value: '10.000+', label: 'Clientes' },
            { value: '4.8/5', label: '⭐ Avaliação' },
            { value: '98%', label: 'Satisfação' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: '14px' }}>{stat.value}</span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px', letterSpacing: '0.3px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right side — product image */}
      <div
        style={{
          width: '50%',
          position: 'relative',
          background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}11 100%)`,
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: `${brandColor}18`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-40px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: `${brandColor}14`,
          }}
        />

        {image ? (
          <img
            src={image}
            alt={title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            {/* Product placeholder illustration */}
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '20px',
                background: `linear-gradient(135deg, ${brandColor}40, ${brandColor}80)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 12px 32px ${brandColor}40`,
              }}
            >
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" fill={brandColor} opacity="0.4"/>
                <path d="M8 12h8M12 8v8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div
              style={{
                background: `${brandColor}20`,
                border: `1px solid ${brandColor}40`,
                borderRadius: '6px',
                padding: '4px 12px',
                fontSize: '11px',
                color: brandColor,
                fontWeight: 600,
              }}
            >
              Imagem do Produto
            </div>
          </div>
        )}

        {/* Discount badge */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: '#FF3B3B',
            color: '#fff',
            borderRadius: '50px',
            padding: '5px 14px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(255,59,59,0.4)',
          }}
        >
          NOVO
        </div>
      </div>
    </div>
  );
};
