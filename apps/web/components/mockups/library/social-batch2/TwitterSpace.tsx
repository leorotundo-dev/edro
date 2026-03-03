import React from 'react';

interface TwitterSpaceProps {
  spaceName?: string;
  name?: string;
  headline?: string;
  title?: string;
  hostName?: string;
  username?: string;
  hostImage?: string;
  profileImage?: string;
  image?: string;
  listeners?: string;
  isLive?: boolean;
}

export const TwitterSpace: React.FC<TwitterSpaceProps> = ({
  spaceName,
  name,
  headline,
  title,
  hostName,
  username,
  hostImage,
  profileImage,
  image,
  listeners = '1,2K',
  isLive = true,
}) => {
  const displayName = spaceName || name || headline || title || 'Título do Space';
  const displayHost = hostName || username || 'Nome do Host';
  const displayHostImage = hostImage || profileImage || image || '';

  return (
    <div style={{ width: '100%', maxWidth: 400, background: 'linear-gradient(135deg, #7C3AED 0%, #2563EB 100%)', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {isLive && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EF4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 9999, marginBottom: 12 }}>
            <div style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }} />
            AO VIVO
          </div>
        )}
        <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>{displayName}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span>{listeners} ouvindo</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid #fff', background: 'rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
          {displayHostImage && <img src={displayHostImage} alt={displayHost} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div>
          <p style={{ color: '#fff', fontWeight: 600, fontSize: 14, margin: 0 }}>{displayHost}</p>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '2px 0 0' }}>Anfitrião</p>
        </div>
      </div>

      <button type="button" style={{ width: '100%', background: '#fff', border: 'none', borderRadius: 9999, color: '#111', fontWeight: 700, fontSize: 15, padding: '12px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
        Entrar no Space
      </button>
    </div>
  );
};
