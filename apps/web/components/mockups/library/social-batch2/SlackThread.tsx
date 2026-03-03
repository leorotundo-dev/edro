import React from 'react';

interface SlackThreadProps {
  username?: string;
  name?: string;
  userAvatar?: string;
  profileImage?: string;
  image?: string;
  message?: string;
  text?: string;
  body?: string;
  caption?: string;
  description?: string;
  replyCount?: number;
}

export const SlackThread: React.FC<SlackThreadProps> = ({
  username,
  name,
  userAvatar,
  profileImage,
  image,
  message,
  text,
  body,
  caption,
  description,
  replyCount = 5,
}) => {
  const displayUsername = username || name || 'Usuário';
  const displayAvatar = userAvatar || profileImage || image || '';
  const displayMessage = message || text || body || caption || description || 'Mensagem original que iniciou o tópico';

  return (
    <div style={{ width: '100%', maxWidth: 600, background: '#fff', border: '1px solid #E8E8E8', borderRadius: 8, overflow: 'hidden', fontFamily: 'Lato, -apple-system, BlinkMacSystemFont, sans-serif', color: '#1D1C1D' }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 4, background: '#DDDDDD', overflow: 'hidden', flexShrink: 0 }}>
            {displayAvatar && <img src={displayAvatar} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1D1C1D' }}>{displayUsername}</span>
              <span style={{ fontSize: 12, color: '#616061' }}>10:30</span>
            </div>
            <p style={{ fontSize: 14, color: '#1D1C1D', margin: '0 0 8px', lineHeight: 1.5 }}>{displayMessage}</p>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#1264A3', fontSize: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1264A3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              {replyCount} respostas
            </button>
          </div>
        </div>
      </div>
      <div style={{ background: '#F8F8F8', borderTop: '1px solid #E8E8E8', padding: '12px 16px 12px 64px' }}>
        <p style={{ fontSize: 12, color: '#616061', margin: 0 }}>Ver tópico</p>
      </div>
    </div>
  );
};
