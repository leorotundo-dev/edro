import React from 'react';

interface LinkedInAdProps {
  companyName?: string;
  name?: string;
  username?: string;
  companyLogo?: string;
  profileImage?: string;
  adImage?: string;
  image?: string;
  postImage?: string;
  headline?: string;
  description?: string;
  body?: string;
  text?: string;
  caption?: string;
  ctaText?: string;
  followers?: string;
}

export const LinkedInAd: React.FC<LinkedInAdProps> = ({
  companyName,
  name,
  username,
  companyLogo,
  profileImage,
  adImage,
  image,
  postImage,
  headline = 'Acelere o crescimento da sua empresa',
  description,
  body,
  text,
  caption,
  ctaText = 'Saiba mais',
  followers = '12.847 seguidores',
}) => {
  const displayName = name || companyName || username || 'Company Name';
  const displayLogo = companyLogo || profileImage || '';
  const displayImage = adImage || image || postImage || '';
  const displayDesc = description || body || text || caption || 'Veja como líderes do setor estão alcançando resultados extraordinários.';

  return (
    <div style={{ width: 552, maxWidth: '100%', background: '#fff', borderRadius: 8, border: '1px solid #E0E0E0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Company logo */}
          <div style={{ width: 48, height: 48, borderRadius: 4, overflow: 'hidden', background: '#E9E5DF', border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 }}>
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0a66c2 0%, #004182 100%)' }} />
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#000', margin: 0, lineHeight: '20px' }}>{displayName}</p>
            <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: '16px' }}>{followers}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="#666">
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm3.5 3.5c.2.7.5 1.4.8 2H9.8a15 15 0 0 0-1.5-2.3c.6.1 1.1.2 1.6.3h.8a.5.5 0 0 0 .8 0zM8 2.5c.9 0 1.8.3 2.5.7a14 14 0 0 0-1.5 2.3H7a14 14 0 0 0-1.5-2.3C6.2 2.8 7.1 2.5 8 2.5zM4.5 4.5c.6-.1 1-.2 1.6-.3A14 14 0 0 0 4.6 6.5H2.7c.3-.6.5-1.3.8-2h1zm-2.2 3h2.2c-.1.6-.1 1.3-.1 2H2.2c0-.7.1-1.4.1-2zm0 3h2.1c0 .7.1 1.4.1 2H2.3c0-.7 0-1.3-.1-2zm2.2 3H3.3c-.3-.6-.5-1.3-.8-2h1.2c.1.7.5 1.4.8 2zm1.1 1A7 7 0 0 1 4.1 13a14 14 0 0 0 1.5-2.3c.5.1 1 .2 1.5.3h.3a15 15 0 0 0 1.5 2.3c-.3.1-.6.2-1 .3-.5.1-1 .2-1.4.2H8zm3.9-1c-.3.6-.5 1.3-.8 2H7.5c.6-.1 1.1-.2 1.6-.3h.8a.5.5 0 0 0 .8 0h1.8zm.3-2h-2.1c0-.7 0-1.3-.1-2H13.7c0 .7.1 1.4.1 2zm0-3h-2.2c0-.7-.1-1.4-.1-2h2.2c.1.7.1 1.3.1 2z" />
              </svg>
              <span style={{ fontSize: 11, color: '#666' }}>Patrocinado</span>
            </div>
          </div>
        </div>
        {/* 3-dot menu */}
        <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#666' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* Ad image */}
      {displayImage ? (
        <img src={displayImage} alt="Ad" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', aspectRatio: '1.91/1', background: 'linear-gradient(135deg, #E9E5DF 0%, #d6d3cc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 13, color: '#999' }}>Imagem do anúncio</span>
        </div>
      )}

      {/* Ad content + CTA */}
      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid #F0F0F0', background: '#F2F2F2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: 14, color: '#000', margin: '0 0 2px', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{headline}</h3>
          <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayDesc}</p>
        </div>
        <button type="button" style={{ background: '#fff', border: '1.5px solid #0a66c2', color: '#0a66c2', fontWeight: 600, fontSize: 14, borderRadius: 24, padding: '6px 18px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          {ctaText}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </button>
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 8px 4px', borderTop: '1px solid #E0E0E0' }}>
        {[
          { label: 'Curtir', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" /><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" /></svg> },
          { label: 'Comentar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> },
          { label: 'Repostar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" /></svg> },
          { label: 'Enviar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg> },
        ].map(({ label, icon }) => (
          <button key={label} type="button" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: '8px 4px', fontSize: 13, fontWeight: 600, borderRadius: 4 }}>
            {icon}{label}
          </button>
        ))}
      </div>
    </div>
  );
};
