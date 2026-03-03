import React from 'react';

interface WhatsAppBusinessProps {
  businessName?: string;
  name?: string;
  username?: string;
  businessLogo?: string;
  profileImage?: string;
  image?: string;
  category?: string;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  address?: string;
  hours?: string;
  website?: string;
}

const MapPinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

const GlobeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const WhatsAppBusiness: React.FC<WhatsAppBusinessProps> = ({
  businessName,
  name,
  username,
  businessLogo,
  profileImage,
  image,
  category = 'Varejo',
  description,
  text,
  body,
  caption,
  address = 'Rua Exemplo, 123, Cidade',
  hours = 'Seg–Sex 9h–18h',
  website = 'www.empresa.com.br',
}) => {
  const displayName = businessName || name || username || 'Nome da Empresa';
  const displayLogo = businessLogo || profileImage || image || '';
  const displayDesc = description || text || body || caption || 'Descrição da empresa';

  return (
    <div style={{ width: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#075E54', padding: '24px 16px 20px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', overflow: 'hidden', margin: '0 auto 12px', border: '2px solid rgba(255,255,255,0.5)' }}>
          {displayLogo ? <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
          )}
        </div>
        <h2 style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>{displayName}</h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: 0 }}>{category}</p>
      </div>
      {/* Body */}
      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: 14, color: '#111', margin: '0 0 16px', lineHeight: '20px' }}>{displayDesc}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}><MapPinIcon /></div>
            <span style={{ fontSize: 14, color: '#111' }}>{address}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}><ClockIcon /></div>
            <span style={{ fontSize: 14, color: '#111' }}>{hours}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flexShrink: 0, marginTop: 1 }}><GlobeIcon /></div>
            <span style={{ fontSize: 14, color: '#128C7E' }}>{website}</span>
          </div>
        </div>
        <button type="button" style={{ width: '100%', background: '#25D366', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: 15, padding: '12px 0', cursor: 'pointer' }}>
          Enviar mensagem
        </button>
      </div>
    </div>
  );
};
