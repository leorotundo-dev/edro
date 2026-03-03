import React from 'react';

interface BannerDescontoProps {
  title?: string;
  headline?: string;
  name?: string;
  brandName?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  discount?: string;
  coupon?: string;
}

export const BannerDesconto: React.FC<BannerDescontoProps> = ({
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
  discount = '30%',
  coupon = 'PROMO30',
}) => {
  const title = titleProp ?? headline ?? 'Produto Destaque';
  const brand = brandName ?? name ?? 'Minha Marca';
  const sub = subtitle ?? description ?? body ?? caption ?? 'Aproveite o desconto exclusivo hoje';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        width: '500px',
        height: '200px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
        border: '1.5px solid #E8ECF4',
        display: 'flex',
        alignItems: 'stretch',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Left — discount percentage badge */}
      <div
        style={{
          flex: '0 0 130px',
          background: `linear-gradient(135deg, ${brandColor}15 0%, ${brandColor}08 100%)`,
          borderRight: `3px solid ${brandColor}20`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px',
          gap: '2px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative arc */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '-40px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            border: `24px solid ${brandColor}12`,
          }}
        />

        <span
          style={{
            color: brandColor,
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            opacity: 0.7,
          }}
        >
          Desconto
        </span>
        <div style={{ lineHeight: 1, display: 'flex', alignItems: 'flex-start', gap: '2px' }}>
          <span
            style={{
              color: brandColor,
              fontSize: '54px',
              fontWeight: 900,
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            {discount}
          </span>
        </div>
        <span
          style={{
            color: brandColor,
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginTop: '-4px',
          }}
        >
          OFF
        </span>
      </div>

      {/* Center — product info + coupon */}
      <div
        style={{
          flex: 1,
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '6px',
        }}
      >
        {/* Brand */}
        <span
          style={{
            color: 'rgba(0,0,0,0.35)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          {brand}
        </span>

        {/* Product name */}
        <h3
          style={{
            color: '#1A1A2E',
            fontSize: '16px',
            fontWeight: 800,
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: 'rgba(0,0,0,0.5)',
            fontSize: '11px',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {sub}
        </p>

        {/* Coupon box */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
          <span
            style={{
              color: 'rgba(0,0,0,0.45)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.3px',
            }}
          >
            Use o cupom:
          </span>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: `${brandColor}08`,
              border: `1.5px dashed ${brandColor}60`,
              borderRadius: '6px',
              padding: '6px 12px',
              alignSelf: 'flex-start',
            }}
          >
            <span
              style={{
                color: brandColor,
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '2px',
                fontFamily: "'Courier New', Courier, monospace",
              }}
            >
              {coupon}
            </span>
            <div
              style={{
                width: '1px',
                height: '16px',
                background: `${brandColor}30`,
              }}
            />
            <span
              style={{
                color: brandColor,
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.5px',
                opacity: 0.7,
              }}
            >
              COPIAR
            </span>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          style={{
            marginTop: '6px',
            alignSelf: 'flex-start',
            background: brandColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '7px',
            padding: '8px 18px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.4px',
            cursor: 'pointer',
            boxShadow: `0 4px 12px ${brandColor}40`,
          }}
        >
          Comprar Agora
        </button>
      </div>

      {/* Right — product image */}
      <div
        style={{
          flex: '0 0 120px',
          position: 'relative',
          overflow: 'hidden',
          background: '#F5F7FA',
          borderLeft: '1px solid #E8ECF4',
        }}
      >
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
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '12px',
                background: `${brandColor}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" fill={brandColor} opacity="0.3"/>
                <circle cx="8.5" cy="8.5" r="1.5" fill={brandColor}/>
                <path d="M21 15l-5-5L5 21" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        )}

        {/* Sticker */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: '#FF3B3B',
            color: '#fff',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 2px 6px rgba(255,59,59,0.4)',
          }}
        >
          <span style={{ fontSize: '9px', fontWeight: 900 }}>{discount}</span>
          <span style={{ fontSize: '7px', fontWeight: 700 }}>OFF</span>
        </div>
      </div>
    </div>
  );
};
