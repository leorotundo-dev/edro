import React from 'react';

interface LinkedInEventProps {
  eventName?: string;
  name?: string;
  headline?: string;
  title?: string;
  eventImage?: string;
  image?: string;
  postImage?: string;
  date?: string;
  time?: string;
  attendees?: number | string;
  isOnline?: boolean;
}

export const LinkedInEvent: React.FC<LinkedInEventProps> = ({
  eventName,
  name,
  headline,
  title,
  eventImage,
  image,
  postImage,
  date = '27 de Janeiro de 2026',
  time = '14h00 – 15h30',
  attendees = 234,
  isOnline = true,
}) => {
  const displayName = eventName || name || headline || title || 'Evento Profissional';
  const displayImage = eventImage || image || postImage || '';

  return (
    <div style={{ width: 500, maxWidth: '100%', background: '#fff', borderRadius: 8, border: '1px solid #E0E0E0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#000' }}>
      {/* Event image */}
      <div style={{ width: '100%', height: 180, background: '#E8F0FE', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
        )}
      </div>
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 12px', color: '#000', lineHeight: '24px' }}>{displayName}</h3>
        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{date}</p>
              <p style={{ fontSize: 13, color: '#666', margin: '2px 0 0' }}>{time}</p>
            </div>
          </div>
          {isOnline && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
              <p style={{ fontSize: 14, margin: 0 }}>Evento online</p>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <p style={{ fontSize: 14, color: '#666', margin: 0 }}>{attendees} participantes</p>
          </div>
        </div>
        <button type="button" style={{ width: '100%', background: '#0A66C2', border: 'none', borderRadius: 20, color: 'white', fontWeight: 700, fontSize: 15, padding: '10px 0', cursor: 'pointer' }}>
          Inscrever-se
        </button>
      </div>
    </div>
  );
};
