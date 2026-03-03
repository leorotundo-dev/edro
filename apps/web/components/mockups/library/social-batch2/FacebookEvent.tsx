import React from 'react';

interface FacebookEventProps {
  eventName?: string;
  name?: string;
  headline?: string;
  title?: string;
  eventImage?: string;
  image?: string;
  postImage?: string;
  date?: string;
  time?: string;
  location?: string;
  address?: string;
  interested?: number | string;
  going?: number | string;
}

export const FacebookEvent: React.FC<FacebookEventProps> = ({
  eventName,
  name,
  headline,
  title,
  eventImage,
  image,
  postImage,
  date = 'Sábado, 27 de Janeiro',
  time = '19h00',
  location,
  address,
  interested = 234,
  going = 89,
}) => {
  const displayName = eventName || name || headline || title || 'Nome do Evento';
  const displayImage = eventImage || image || postImage || '';
  const displayLocation = location || address || 'Local do evento';

  return (
    <div style={{ width: 500, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: '1px solid #E4E6EB', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: '#050505' }}>
      <div style={{ width: '100%', height: 200, background: '#E4E6EB', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1877F2 0%, #0052cc 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </div>
        )}
      </div>
      <div style={{ padding: '16px' }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#050505' }}>{displayName}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0, lineHeight: '18px' }}>{date}</p>
              <p style={{ fontSize: 14, color: '#65676B', margin: '2px 0 0' }}>{time}</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <p style={{ fontSize: 14, margin: 0 }}>{displayLocation}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <p style={{ fontSize: 14, color: '#65676B', margin: 0 }}>{going} vão · {interested} interessados</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={{ flex: 1, background: '#1877F2', border: 'none', borderRadius: 6, color: 'white', fontWeight: 700, fontSize: 14, padding: '10px 0', cursor: 'pointer' }}>
            Tenho interesse
          </button>
          <button type="button" style={{ flex: 1, background: '#E4E6EB', border: 'none', borderRadius: 6, color: '#050505', fontWeight: 700, fontSize: 14, padding: '10px 0', cursor: 'pointer' }}>
            Compartilhar
          </button>
        </div>
      </div>
    </div>
  );
};
