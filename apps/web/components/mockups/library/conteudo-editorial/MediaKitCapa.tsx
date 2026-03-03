'use client';

import React from 'react';

interface MediaKitCapaProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const MediaKitCapa: React.FC<MediaKitCapaProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#1e1b4b',
}) => {
  const resolvedBrand = brandName || name || 'Marca Digital';
  const resolvedTagline =
    headline || title || body || text || description || caption ||
    'Conectando marcas a audiências que realmente importam.';
  const resolvedContact = username || 'contato@marcadigital.com.br';
  const resolvedLogo = profileImage || image || postImage || thumbnail || null;
  const accent = brandColor || '#1e1b4b';

  const stats = [
    { value: '2.4M', label: 'Alcance Mensal' },
    { value: '380k', label: 'Seguidores' },
    { value: '8.7%', label: 'Engajamento' },
    { value: '94%', label: 'Satisfação' },
  ];

  const channels = [
    { name: 'Instagram', icon: '📸', followers: '142k' },
    { name: 'YouTube', icon: '▶️', followers: '98k' },
    { name: 'LinkedIn', icon: '💼', followers: '87k' },
    { name: 'Newsletter', icon: '📧', followers: '53k' },
  ];

  return (
    <div
      style={{
        width: '380px',
        background: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 48px rgba(0,0,0,0.14)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes mkc-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mkc-card { animation: mkc-fade 0.4s ease; }
      `}</style>

      <div className="mkc-card">
        {/* Hero cover */}
        <div
          style={{
            background: `linear-gradient(155deg, ${accent} 0%, ${accent}ee 55%, #4f46e5 100%)`,
            padding: '32px 28px 26px',
            position: 'relative',
            overflow: 'hidden',
            textAlign: 'center',
          }}
        >
          <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '180px', height: '180px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', bottom: '-40px', left: '-40px', width: '130px', height: '130px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

          {/* Logo */}
          {resolvedLogo ? (
            <img
              src={resolvedLogo}
              alt={resolvedBrand}
              style={{ width: '70px', height: '70px', borderRadius: '18px', objectFit: 'cover', margin: '0 auto 12px', display: 'block', border: '3px solid rgba(255,255,255,0.3)' }}
            />
          ) : (
            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '18px',
                background: 'rgba(255,255,255,0.18)',
                border: '3px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
                color: '#fff',
                fontSize: '26px',
                fontWeight: 900,
              }}
            >
              {resolvedBrand.charAt(0)}
            </div>
          )}

          <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            {resolvedBrand}
          </h1>

          <div
            style={{
              display: 'inline-block',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '4px 14px',
              borderRadius: '20px',
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              marginBottom: '10px',
            }}
          >
            Media Kit 2025
          </div>

          <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.82)', margin: 0, lineHeight: 1.55, maxWidth: '280px', marginLeft: 'auto', marginRight: 'auto' }}>
            {resolvedTagline}
          </p>
        </div>

        {/* Key stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #f3f4f6' }}>
          {stats.map((s, i) => (
            <div key={i} style={{ padding: '12px 6px', textAlign: 'center', borderRight: i < 3 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ fontSize: '17px', fontWeight: 900, color: accent, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '3px', fontWeight: 600, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Channels */}
        <div style={{ padding: '16px 22px 10px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Canais de Distribuição
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            {channels.map((ch, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', borderRadius: '8px', padding: '8px 10px' }}>
                <span style={{ fontSize: '16px' }}>{ch.icon}</span>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{ch.name}</div>
                  <div style={{ fontSize: '10px', color: accent, fontWeight: 700 }}>{ch.followers}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Contact */}
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Contato Comercial
          </div>
          {[
            { icon: '✉️', text: resolvedContact },
            { icon: '🌐', text: 'www.marcadigital.com.br' },
          ].map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '13px' }}>{c.icon}</span>
              <span style={{ fontSize: '12px', color: '#374151' }}>{c.text}</span>
            </div>
          ))}
        </div>

        {/* Download CTA */}
        <div style={{ padding: '0 22px 18px' }}>
          <button
            type="button"
            aria-label="Baixar mídia kit completo em PDF"
            style={{
              width: '100%',
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '9px',
              padding: '11px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar Mídia Kit (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};
