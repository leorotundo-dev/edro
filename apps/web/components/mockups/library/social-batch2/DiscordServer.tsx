import React from 'react';

interface DiscordServerProps {
  serverName?: string;
  name?: string;
  headline?: string;
  serverIcon?: string;
  image?: string;
  profileImage?: string;
  memberCount?: string | number;
  onlineCount?: string | number;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
}

export const DiscordServer: React.FC<DiscordServerProps> = ({
  serverName,
  name,
  headline,
  serverIcon,
  image,
  profileImage,
  memberCount = '1,2K',
  onlineCount = '234',
  description,
  text,
  body,
  caption,
}) => {
  const displayName = serverName || name || headline || 'Nome do Servidor';
  const displayIcon = serverIcon || image || profileImage || '';
  const displayDesc = description || text || body || caption || '';

  return (
    <div style={{ width: 300, maxWidth: '100%', background: '#2B2D31', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.4)', overflow: 'hidden', fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif' }}>
      <div style={{ height: 80, background: 'linear-gradient(135deg, #5865F2 0%, #3B3F98 100%)' }} />
      <div style={{ position: 'relative', padding: '0 16px' }}>
        <div style={{ position: 'absolute', top: -28, left: 16, width: 56, height: 56, borderRadius: '50%', border: '4px solid #2B2D31', background: '#5865F2', overflow: 'hidden' }}>
          {displayIcon ? (
            <img src={displayIcon} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>{displayName[0]}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '36px 16px 16px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#F2F3F5', margin: '0 0 8px' }}>{displayName}</h3>
        {displayDesc && <p style={{ fontSize: 13, color: '#B5BAC1', margin: '0 0 12px', lineHeight: '18px' }}>{displayDesc}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#23A55A' }} />
            <span style={{ fontSize: 13, color: '#B5BAC1' }}>{onlineCount} online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#80848E' }} />
            <span style={{ fontSize: 13, color: '#B5BAC1' }}>{memberCount} membros</span>
          </div>
        </div>
        <button type="button" style={{ width: '100%', background: '#5865F2', border: 'none', borderRadius: 4, color: 'white', fontWeight: 600, fontSize: 14, padding: '10px 0', cursor: 'pointer' }}>
          Entrar no Servidor
        </button>
      </div>
    </div>
  );
};
