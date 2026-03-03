'use client';
import React, { useState } from 'react';

interface GooglePerformanceMaxProps {
  headline?: string;
  name?: string;
  title?: string;
  description?: string;
  body?: string;
  caption?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  logo?: string;
  profileImage?: string;
  brandName?: string;
  username?: string;
  ctaText?: string;
  brandColor?: string;
  websiteUrl?: string;
  finalUrl?: string;
}

// Google "G" logo
const GoogleG = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.5 20-21 0-1.3-.2-2.7-.5-4z"/>
    <path fill="#34A853" d="M6.3 14.7l7 5.1C15.1 16 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.1-17.7 10.2z" transform="translate(0,-1)"/>
    <path fill="#FBBC05" d="M24 45c5.4 0 10.4-1.9 14.3-5l-6.6-5.5C29.6 36 26.9 37 24 37c-6.1 0-11.3-4.2-12.8-9.8l-7 5.4C7.6 40.5 15.2 45 24 45z"/>
    <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.7 2.6-2.3 4.8-4.4 6.3l.1-.1 6.6 5.5C37.8 37.3 44 32 44 24c0-1.3-.2-2.7-.5-4z" transform="translate(0,2)"/>
  </svg>
);

export const GooglePerformanceMax: React.FC<GooglePerformanceMaxProps> = ({
  headline,
  name,
  title,
  description,
  body,
  caption,
  text,
  image,
  postImage,
  thumbnail,
  logo,
  profileImage,
  brandName,
  username,
  ctaText = 'Saiba Mais',
  brandColor = '#1A73E8',
  websiteUrl,
  finalUrl,
}) => {
  const [activeFormat, setActiveFormat] = useState<'search' | 'display' | 'youtube'>('search');

  const displayImage = image || postImage || thumbnail || '';
  const displayLogo = logo || profileImage || '';
  const displayHeadline = headline || name || title || 'Headline Principal da Campanha';
  const displayDesc = description || body || caption || text || 'Descrição persuasiva da sua oferta especial.';
  const displayBrand = brandName || username || 'Sua Marca';
  const domain = (websiteUrl || finalUrl || `www.${displayBrand.toLowerCase().replace(/\s/g, '')}.com.br`)
    .replace(/^https?:\/\//, '').split('/')[0];

  const formats = [
    { key: 'search' as const, label: 'Busca' },
    { key: 'display' as const, label: 'Display' },
    { key: 'youtube' as const, label: 'YouTube' },
  ];

  return (
    <div style={{
      width: 420,
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: 'Google Sans, "Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      border: '1px solid #E8EAED',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        background: '#F8F9FA',
        padding: '12px 16px',
        borderBottom: '1px solid #E8EAED',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GoogleG size={18} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#202124' }}>Performance Max</div>
            <div style={{ fontSize: 11, color: '#70757A' }}>Campanha inteligente Google</div>
          </div>
        </div>
        <div style={{
          background: '#E8F0FE', borderRadius: 12,
          padding: '3px 10px', fontSize: 11, fontWeight: 700, color: '#1A73E8',
        }}>
          Ativo
        </div>
      </div>

      {/* Format tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid #E8EAED',
        padding: '0 16px',
      }}>
        {formats.map(f => (
          <button
            key={f.key}
            type="button"
            aria-label={`Ver formato ${f.label}`}
            onClick={() => setActiveFormat(f.key)}
            style={{
              padding: '10px 14px',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: activeFormat === f.key ? 700 : 400,
              color: activeFormat === f.key ? '#1A73E8' : '#70757A',
              borderBottom: activeFormat === f.key ? `2px solid #1A73E8` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Search format */}
      {activeFormat === 'search' && (
        <div style={{ padding: '16px' }}>
          {/* Sponsored */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{
              fontSize: 12, color: '#70757A', fontWeight: 400,
              border: '1px solid #70757A', borderRadius: 3,
              padding: '0 4px', lineHeight: '16px',
            }}>Patrocinado</span>
          </div>
          {/* Domain */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: '#F8F9FA', border: '1px solid #E8EAED',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {displayLogo
                ? <img src={displayLogo} alt={displayBrand} style={{ width: 18, height: 18, objectFit: 'contain' }} />
                : <GoogleG size={14} />
              }
            </div>
            <div>
              <div style={{ fontSize: 14, color: '#202124', fontWeight: 500 }}>{displayBrand}</div>
              <div style={{ fontSize: 12, color: '#70757A' }}>{domain}</div>
            </div>
          </div>
          {/* Headline */}
          <div style={{ fontSize: 20, color: '#1A0DAB', fontWeight: 400, lineHeight: 1.3, marginBottom: 4 }}>
            {displayHeadline} · Oferta Especial · {ctaText}
          </div>
          {/* Description */}
          <div style={{ fontSize: 14, color: '#4D5156', lineHeight: 1.5 }}>{displayDesc}</div>
          {/* Sitelinks */}
          <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {['Produtos', 'Sobre', 'Contato', 'Ofertas'].map((sl) => (
              <span key={sl} style={{ fontSize: 14, color: '#1A0DAB', cursor: 'pointer' }}>{sl}</span>
            ))}
          </div>
        </div>
      )}

      {/* Display format */}
      {activeFormat === 'display' && (
        <div style={{ padding: '0' }}>
          <div style={{ position: 'relative', background: '#F8F9FA', height: 180, overflow: 'hidden' }}>
            {displayImage
              ? <img src={displayImage} alt={displayHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{
                  width: '100%', height: '100%',
                  background: `linear-gradient(135deg, ${brandColor}33 0%, ${brandColor}66 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.2" opacity="0.6">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )
            }
            <div style={{ position: 'absolute', top: 8, left: 8, background: '#fff', border: '1px solid #70757A', borderRadius: 3, padding: '1px 6px', fontSize: 10, fontWeight: 600, color: '#70757A' }}>
              Patrocinado
            </div>
          </div>
          <div style={{ padding: '10px 14px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{displayBrand.charAt(0)}</span>
              </div>
              <span style={{ fontSize: 12, color: '#70757A' }}>{displayBrand}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#202124', marginBottom: 4 }}>{displayHeadline}</div>
            <div style={{ fontSize: 12, color: '#5F6368', marginBottom: 10, lineHeight: 1.5 }}>{displayDesc}</div>
            <button type="button" aria-label={ctaText} style={{
              background: brandColor, color: '#fff', border: 'none',
              borderRadius: 4, padding: '7px 14px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%',
            }}>{ctaText}</button>
          </div>
        </div>
      )}

      {/* YouTube format */}
      {activeFormat === 'youtube' && (
        <div style={{ padding: '0' }}>
          <div style={{ position: 'relative', background: '#000', height: 200, overflow: 'hidden' }}>
            {displayImage
              ? <img src={displayImage} alt={displayHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
              : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(160deg, #111 0%, #2a2a2a 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="60" height="42" viewBox="0 0 60 42" fill="none">
                    <rect width="60" height="42" rx="8" fill="#FF0000" />
                    <polygon points="24,12 24,30 40,21" fill="white" />
                  </svg>
                </div>
              )
            }
            {/* Skip button */}
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              background: 'rgba(0,0,0,0.7)', borderRadius: 4,
              padding: '5px 10px', color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              Pular <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="white" strokeWidth="2"/></svg>
            </div>
            {/* Ad badge */}
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: '#FFFF00', borderRadius: 3,
              padding: '2px 7px', fontSize: 11, fontWeight: 700, color: '#000',
            }}>Anúncio</div>
          </div>
          <div style={{ padding: '10px 14px 14px', background: '#1F1F1F' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{displayHeadline}</div>
            <div style={{ fontSize: 12, color: '#AAAAAA', marginBottom: 10 }}>{domain}</div>
            <button type="button" aria-label={ctaText} style={{
              background: '#fff', color: '#0F0F0F', border: 'none',
              borderRadius: 18, padding: '7px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{ctaText}</button>
          </div>
        </div>
      )}

      {/* Footer stats */}
      <div style={{
        background: '#F8F9FA',
        borderTop: '1px solid #E8EAED',
        padding: '10px 16px',
        display: 'flex', gap: 20,
      }}>
        {[
          { label: 'Impressões', value: '12.4mil' },
          { label: 'Cliques', value: '1.234' },
          { label: 'CTR', value: '9,9%' },
          { label: 'Conv.', value: '89' },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#202124' }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: '#70757A', marginTop: 1 }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
