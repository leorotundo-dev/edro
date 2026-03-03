import React from 'react';

interface BannerBlackFridayProps {
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
}

export const BannerBlackFriday: React.FC<BannerBlackFridayProps> = ({
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
  discount = '70%',
}) => {
  const title = titleProp ?? headline ?? 'As Melhores Ofertas do Ano';
  const brand = brandName ?? name ?? 'MINHA MARCA';
  const sub = subtitle ?? description ?? body ?? caption ?? 'Descontos imperdíveis em toda a loja';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  const accentYellow = '#FFE000';

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        width: '600px',
        height: '250px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: '#000000',
        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Background product image (very dark overlay) */}
      {image && (
        <img
          src={image}
          alt="produto"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.08,
          }}
        />
      )}

      {/* Abstract decorative shapes */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accentYellow}18 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-50px',
          left: '30%',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColor}20 0%, transparent 70%)`,
        }}
      />

      {/* Diagonal accent line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, transparent, ${accentYellow}, transparent)`,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          display: 'flex',
          alignItems: 'stretch',
        }}
      >
        {/* Left column */}
        <div
          style={{
            flex: '0 0 260px',
            padding: '24px 20px 24px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          {/* Brand */}
          <span
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
            }}
          >
            {brand}
          </span>

          {/* BLACK FRIDAY text */}
          <div style={{ lineHeight: 0.9 }}>
            <div
              style={{
                color: '#ffffff',
                fontSize: '36px',
                fontWeight: 900,
                letterSpacing: '-1px',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              BLACK
            </div>
            <div
              style={{
                color: accentYellow,
                fontSize: '36px',
                fontWeight: 900,
                letterSpacing: '-1px',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              FRIDAY
            </div>
          </div>

          <p
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontSize: '12px',
              lineHeight: 1.45,
              margin: '4px 0 0 0',
            }}
          >
            {sub}
          </p>

          {/* CTA */}
          <button
            type="button"
            style={{
              marginTop: '10px',
              alignSelf: 'flex-start',
              background: accentYellow,
              color: '#000000',
              border: 'none',
              borderRadius: '7px',
              padding: '10px 22px',
              fontSize: '12px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              boxShadow: `0 4px 16px ${accentYellow}60`,
            }}
          >
            Ver Ofertas
          </button>
        </div>

        {/* Center divider */}
        <div
          style={{
            width: '1px',
            background: 'rgba(255,255,255,0.08)',
            margin: '20px 0',
          }}
        />

        {/* Right column — discount badge */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            gap: '8px',
          }}
        >
          {/* Main discount */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: 1,
              gap: '2px',
            }}
          >
            <span
              style={{
                color: 'rgba(255,255,255,0.35)',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}
            >
              Ate
            </span>
            <span
              style={{
                color: accentYellow,
                fontSize: '70px',
                fontWeight: 900,
                letterSpacing: '-4px',
                lineHeight: 0.9,
              }}
            >
              {discount}
            </span>
            <span
              style={{
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 900,
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              OFF
            </span>
          </div>

          {/* Countdown hint */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '4px',
            }}
          >
            {[
              { v: '23', l: 'H' },
              { v: '59', l: 'M' },
              { v: '47', l: 'S' },
            ].map((u, i) => (
              <React.Fragment key={u.l}>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1px',
                  }}
                >
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '4px',
                      width: '30px',
                      height: '26px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: '12px', fontWeight: 800 }}>{u.v}</span>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '8px', fontWeight: 600 }}>{u.l}</span>
                </div>
                {i < 2 && (
                  <span style={{ color: accentYellow, fontSize: '14px', fontWeight: 900, marginBottom: '10px', alignSelf: 'flex-end' }}>:</span>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Headline below */}
          <p
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '10px',
              textAlign: 'center',
              margin: 0,
              letterSpacing: '0.5px',
            }}
          >
            {title}
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: accentYellow,
          padding: '5px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ color: '#000', fontSize: '10px', fontWeight: 800, letterSpacing: '1px' }}>
          FRETE GRATIS EM TODAS AS COMPRAS
        </span>
        <span style={{ color: '#000', fontSize: '10px', fontWeight: 800, letterSpacing: '1px' }}>
          PARCELE SEM JUROS
        </span>
        <span style={{ color: '#000', fontSize: '10px', fontWeight: 800, letterSpacing: '1px' }}>
          TROCA FACIL
        </span>
      </div>
    </div>
  );
};
