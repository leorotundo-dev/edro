import React from 'react';

interface WhatsAppCallProps {
  contactName?: string;
  name?: string;
  username?: string;
  contactImage?: string;
  profileImage?: string;
  image?: string;
  callType?: 'voice' | 'video';
  duration?: string;
}

export const WhatsAppCall: React.FC<WhatsAppCallProps> = ({
  contactName,
  name,
  username,
  contactImage,
  profileImage,
  image,
  callType = 'voice',
  duration = '00:45',
}) => {
  const displayName = contactName || name || username || 'Nome do Contato';
  const displayImage = contactImage || profileImage || image || '';

  return (
    <div style={{ width: '100%', maxWidth: 300, background: 'linear-gradient(to bottom, #075E54, #128C7E)', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ width: 96, height: 96, margin: '0 auto 16px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {displayImage && <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>{displayName}</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>{duration}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <button type="button" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        {callType === 'video' && (
          <button type="button" style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
        )}
        <button type="button" style={{ width: 56, height: 56, background: '#EF4444', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(135deg)' }}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.95-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7a2 2 0 0 1 1.72 2.02z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
