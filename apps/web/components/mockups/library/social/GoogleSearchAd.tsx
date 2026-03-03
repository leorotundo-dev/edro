import React from 'react';

interface GoogleSearchAdProps {
  headline1?: string;
  headline2?: string;
  headline3?: string;
  headline?: string;
  name?: string;
  title?: string;
  description1?: string;
  description2?: string;
  body?: string;
  caption?: string;
  description?: string;
  displayUrl?: string;
  urlPath1?: string;
  urlPath2?: string;
  brandName?: string;
  username?: string;
  sitelink1?: string;
  sitelink2?: string;
  sitelink3?: string;
  sitelink4?: string;
  brandColor?: string;
}

// Google "G" logo — 4-color
const GoogleG = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.3-.2-2.7-.5-4z"/>
    <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.1-17.7 10.2z" transform="translate(0,-1)"/>
    <path fill="#FBBC05" d="M24 45c5.4 0 10.4-1.9 14.3-5l-6.6-5.5C29.6 36 26.9 37 24 37c-6.1 0-11.3-4.2-12.8-9.8l-7 5.4C7.6 40.5 15.2 45 24 45z"/>
    <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.7 2.6-2.3 4.8-4.4 6.3l.1-.1 6.6 5.5C37.8 37.3 44 32 44 24c0-1.3-.2-2.7-.5-4z" transform="translate(0,2)"/>
  </svg>
);

export const GoogleSearchAd: React.FC<GoogleSearchAdProps> = ({
  headline1,
  headline2,
  headline3,
  headline,
  name,
  title,
  description1,
  description2,
  body,
  caption,
  description,
  displayUrl,
  urlPath1 = 'categoria',
  urlPath2 = 'produto',
  brandName,
  username,
  sitelink1,
  sitelink2,
  sitelink3,
  sitelink4,
}) => {
  const displayBrand = brandName || username || displayUrl || 'www.suamarca.com.br';
  const cleanDomain = displayBrand.replace(/^https?:\/\//, '').split('/')[0];

  const h1 = headline1 || headline || name || title || 'Headline Principal da Marca';
  const h2 = headline2 || 'Segunda Parte do Título';
  const h3 = headline3 || 'Call to Action Aqui';
  const fullHeadline = [h1, h2, h3].filter(Boolean).join(' | ');

  const desc = [
    description1 || body || caption || description || 'Conheça nossa oferta especial com as melhores condições do mercado.',
    description2,
  ].filter(Boolean).join(' ');

  const sl1 = sitelink1 || 'Sobre Nós';
  const sl2 = sitelink2 || 'Produtos';
  const sl3 = sitelink3 || 'Contato';
  const sl4 = sitelink4 || 'Promoções';

  return (
    <div style={{
      width: '100%',
      maxWidth: 660,
      background: '#fff',
      fontFamily: 'Google Sans, "Helvetica Neue", Helvetica, Arial, sans-serif',
      padding: '14px 0',
    }}>
      {/* Sponsored label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{
          fontSize: 12,
          color: '#70757A',
          fontWeight: 400,
          letterSpacing: '0.01em',
          border: '1px solid #70757A',
          borderRadius: 3,
          padding: '0 4px',
          lineHeight: '16px',
        }}>
          Patrocinado
        </span>
      </div>

      {/* Domain line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#F8F9FA',
          border: '1px solid #E8EAED',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <GoogleG size={18} />
        </div>
        <div>
          <div style={{ fontSize: 14, color: '#202124', lineHeight: '18px', fontWeight: 500 }}>
            {cleanDomain}
          </div>
          <div style={{ fontSize: 13, color: '#4D5156', lineHeight: '16px' }}>
            {cleanDomain} › {urlPath1} › {urlPath2}
          </div>
        </div>
        <button type="button" aria-label="Mais informações" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 'auto', lineHeight: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#70757A" strokeWidth="1.5" />
            <line x1="12" y1="11" x2="12" y2="17" stroke="#70757A" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="12" cy="8" r="0.8" fill="#70757A" />
          </svg>
        </button>
      </div>

      {/* Headline */}
      <h3 style={{
        fontSize: 20,
        fontWeight: 400,
        color: '#1A0DAB',
        margin: '4px 0 2px',
        lineHeight: '26px',
        cursor: 'pointer',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {fullHeadline}
      </h3>

      {/* Description */}
      <p style={{
        fontSize: 14,
        color: '#4D5156',
        margin: '4px 0 8px',
        lineHeight: '20px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {desc}
      </p>

      {/* Sitelinks */}
      <div style={{ display: 'flex', gap: 0, flexWrap: 'wrap' }}>
        {[sl1, sl2, sl3, sl4].map((link, i) => (
          <React.Fragment key={i}>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                fontSize: 14,
                color: '#1A0DAB',
                textDecoration: 'none',
                padding: '4px 0',
                marginRight: 16,
                whiteSpace: 'nowrap',
              }}
            >
              {link}
            </a>
            {i < 3 && (
              <span style={{ color: '#70757A', fontSize: 14, padding: '4px 0', marginRight: 16 }}>·</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
