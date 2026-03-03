'use client';

import React from 'react';

interface LogoFaviconProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const LogoFavicon: React.FC<LogoFaviconProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#1a56db',
}) => {
  const resolvedBrand = brandName || name || username || 'Marca';
  const resolvedTagline = headline || title || body || caption || description || text || 'Plataforma de Marketing Digital';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1a56db';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const tabs = [
    { label: resolvedBrand, active: true },
    { label: 'Nova aba', active: false },
    { label: 'Configurações', active: false },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes fav-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fav-wrap { animation: fav-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
        Favicon / Aba do Navegador
      </div>

      {/* Browser chrome mockup */}
      <div
        className="fav-wrap"
        style={{
          width: '380px',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.12)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Title bar */}
        <div style={{ background: '#f0f1f3', padding: '10px 12px 0', display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', marginRight: '10px', paddingBottom: '10px' }}>
            {['#ff5f57', '#febc2e', '#28c840'].map((c, i) => (
              <div key={i} style={{ width: '11px', height: '11px', borderRadius: '50%', background: c }} />
            ))}
          </div>

          {/* Tabs */}
          {tabs.map((tab, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px 8px',
                borderRadius: '8px 8px 0 0',
                background: tab.active ? '#ffffff' : 'transparent',
                border: tab.active ? '1px solid #e5e7eb' : '1px solid transparent',
                borderBottom: tab.active ? '1px solid #fff' : '1px solid transparent',
                minWidth: '100px',
                maxWidth: '160px',
                cursor: 'default',
                position: 'relative',
                zIndex: tab.active ? 2 : 1,
              }}
            >
              {/* Favicon 16×16 */}
              {tab.active ? (
                resolvedLogo ? (
                  <img
                    src={resolvedLogo}
                    alt={resolvedBrand}
                    style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '2px', flexShrink: 0 }}
                  />
                ) : (
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '3px',
                      background: accent,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '8px',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {initial}
                  </div>
                )
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: tab.active ? 600 : 400,
                  color: tab.active ? '#111827' : '#9ca3af',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </span>
              {tab.active && (
                <button
                  type="button"
                  aria-label="Fechar aba"
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    padding: '1px',
                    cursor: 'pointer',
                    color: '#9ca3af',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Address bar */}
        <div style={{ background: '#ffffff', padding: '8px 12px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button type="button" aria-label="Voltar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button type="button" aria-label="Avançar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button type="button" aria-label="Recarregar página" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          </button>
          <div
            style={{
              flex: 1,
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>www.{resolvedBrand.toLowerCase().replace(/\s+/g, '')}.com.br</span>
          </div>
        </div>

        {/* Page content preview */}
        <div style={{ background: '#fff', padding: '20px 24px 24px', minHeight: '120px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 900,
                }}
              >
                {initial}
              </div>
            )}
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>{resolvedBrand}</div>
          </div>
          <div style={{ fontSize: '11.5px', color: '#6b7280', lineHeight: 1.6 }}>{resolvedTagline}</div>
          <div style={{ marginTop: '14px', height: '8px', background: '#f3f4f6', borderRadius: '4px', width: '80%' }} />
          <div style={{ marginTop: '6px', height: '8px', background: '#f3f4f6', borderRadius: '4px', width: '55%' }} />
        </div>
      </div>

      {/* Favicon sizes showcase */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 16px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tamanhos:</span>
        {[{ size: 16, label: '16px' }, { size: 24, label: '32px' }, { size: 36, label: '64px' }].map(({ size, label }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrand} style={{ width: `${size}px`, height: `${size}px`, objectFit: 'contain' }} />
            ) : (
              <div
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: `${Math.round(size * 0.22)}px`,
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: `${Math.round(size * 0.55)}px`,
                  fontWeight: 900,
                }}
              >
                {initial}
              </div>
            )}
            <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
