import React from 'react';

interface WhatsAppMessageProps {
  contactName?: string;
  name?: string;
  username?: string;
  contactImage?: string;
  profileImage?: string;
  message?: string;
  text?: string;
  caption?: string;
  description?: string;
  messageImage?: string;
  image?: string;
  postImage?: string;
  time?: string;
  timeAgo?: string;
}

// Double checkmark (read receipts) — blue
const ReadReceipts = () => (
  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
    <path d="M1 5l3 3L10 1" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 5l3 3 6-7" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const WhatsAppMessage: React.FC<WhatsAppMessageProps> = ({
  contactName,
  name,
  username,
  contactImage,
  profileImage,
  message,
  text,
  caption,
  description,
  messageImage,
  image,
  postImage,
  time = '10:30',
}) => {
  const displayName = name || contactName || username || 'Contato';
  const displayImage = contactImage || profileImage || '';
  const msgText = message || text || caption || description || '';
  const msgMedia = messageImage || image || postImage || '';

  return (
    <div style={{ width: 390, background: '#111B21', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>

      {/* Status bar */}
      <div style={{ background: '#1F2C34', padding: '10px 16px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>9:41</span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="white"><rect x="0" y="4" width="3" height="8" rx="1" /><rect x="4.5" y="2.5" width="3" height="9.5" rx="1" /><rect x="9" y="1" width="3" height="11" rx="1" /><rect x="13.5" y="0" width="2.5" height="12" rx="1" /></svg>
          <svg width="16" height="12" viewBox="0 0 22 16" fill="white"><path d="M11 3.5C7.5 3.5 4.4 5 2.2 7.4L0 5.2C2.8 2 6.7 0 11 0s8.2 2 11 5.2l-2.2 2.2C17.6 5 14.5 3.5 11 3.5z" /><path d="M11 8c-2.1 0-4 .9-5.4 2.3L3.4 8.1C5.3 6.2 8 5 11 5s5.7 1.2 7.6 3.1l-2.2 2.2C15 8.9 13.1 8 11 8z" /><circle cx="11" cy="14" r="2" /></svg>
          <svg width="24" height="12" viewBox="0 0 24 12" fill="white"><rect x="0" y="1" width="20" height="10" rx="2" stroke="white" strokeWidth="1.2" fill="none" /><rect x="2" y="3" width="14" height="6" rx="1" fill="white" /><path d="M21 4v4a2 2 0 0 0 0-4z" fill="white" /></svg>
        </div>
      </div>

      {/* Chat header */}
      <div style={{ background: '#1F2C34', padding: '8px 12px 12px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #2A3942' }}>
        {/* Back arrow */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        {/* Avatar */}
        <div style={{ width: 42, height: 42, borderRadius: '50%', overflow: 'hidden', background: '#2A3942', flexShrink: 0 }}>
          {displayImage ? (
            <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#8696A0"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ color: '#E9EDEF', fontSize: 16, fontWeight: 600, margin: 0, lineHeight: '20px' }}>{displayName}</p>
          <p style={{ color: '#8696A0', fontSize: 12, margin: 0, lineHeight: '16px' }}>online</p>
        </div>
        {/* Action icons */}
        <div style={{ display: 'flex', gap: 20, color: '#8696A0' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M15.9 14.3H15l-.3-.3c1-1.1 1.6-2.7 1.6-4.3C16.3 5.8 13.5 3 10 3S3.7 5.8 3.7 9.7s2.8 6.7 6.3 6.7c1.6 0 3-.6 4.1-1.6l.3.3v.8l5.1 5.1 1.5-1.5-5.1-5.2zm-5.9 0C7.2 14.3 4.8 11.8 4.8 9s2.4-5.3 5.2-5.3 5.2 2.4 5.2 5.3-2.3 5.3-5.2 5.3z" /></svg>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
        </div>
      </div>

      {/* Chat background */}
      <div style={{ background: '#0B141A', padding: '12px 8px 8px', minHeight: 280 }}>

        {/* Date separator */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div style={{ background: '#1F2C34', borderRadius: 8, padding: '4px 10px' }}>
            <span style={{ color: '#8696A0', fontSize: 12 }}>Hoje</span>
          </div>
        </div>

        {/* Incoming message */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 6, paddingRight: 52 }}>
          <div style={{ background: '#202C33', borderRadius: '0 8px 8px 8px', padding: '6px 8px 4px', maxWidth: '100%', position: 'relative' }}>
            {/* Tail */}
            <div style={{ position: 'absolute', top: 0, left: -8, width: 0, height: 0, borderTop: '8px solid #202C33', borderLeft: '8px solid transparent' }} />
            {msgMedia ? (
              <div style={{ borderRadius: 6, overflow: 'hidden', marginBottom: 4, maxWidth: 260 }}>
                <img src={msgMedia} alt="Mídia" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
              </div>
            ) : null}
            {msgText ? (
              <p style={{ color: '#E9EDEF', fontSize: 14.5, lineHeight: 1.4, margin: '0 0 2px', wordBreak: 'break-word', maxWidth: 260 }}>{msgText}</p>
            ) : (
              <p style={{ color: '#E9EDEF', fontSize: 14.5, lineHeight: 1.4, margin: '0 0 2px', maxWidth: 260 }}>Olá! Como posso te ajudar? 😊</p>
            )}
            <p style={{ color: '#8696A0', fontSize: 11, margin: 0, textAlign: 'right' }}>{time}</p>
          </div>
        </div>

        {/* Outgoing message (reply) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6, paddingLeft: 52 }}>
          <div style={{ background: '#005C4B', borderRadius: '8px 0 8px 8px', padding: '6px 8px 4px', maxWidth: '100%', position: 'relative' }}>
            {/* Tail */}
            <div style={{ position: 'absolute', top: 0, right: -8, width: 0, height: 0, borderTop: '8px solid #005C4B', borderRight: '8px solid transparent' }} />
            <p style={{ color: '#E9EDEF', fontSize: 14.5, lineHeight: 1.4, margin: '0 0 2px', wordBreak: 'break-word', maxWidth: 260 }}>Obrigado pelo contato! 👍</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
              <span style={{ color: '#8696A0', fontSize: 11 }}>{time}</span>
              <ReadReceipts />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ background: '#1F2C34', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Emoji */}
        <button type="button" aria-label="Emoji" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#8696A0"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm3.5-9c.8 0 1.5-.7 1.5-1.5S16.3 8 15.5 8 14 8.7 14 9.5s.7 1.5 1.5 1.5zm-7 0c.8 0 1.5-.7 1.5-1.5S9.3 8 8.5 8 7 8.7 7 9.5 7.7 11 8.5 11zm3.5 6.5c2.3 0 4.3-1.5 5.1-3.5H6.9c.8 2 2.8 3.5 5.1 3.5z" /></svg>
        </button>
        {/* Text input */}
        <div style={{ flex: 1, background: '#2A3942', borderRadius: 24, padding: '9px 14px', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#8696A0', fontSize: 14.5 }}>Mensagem</span>
        </div>
        {/* Attachment */}
        <button type="button" aria-label="Anexar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#8696A0"><path d="M12 4.5C9 4.5 6.5 7 6.5 10v8c0 2.2 1.8 4 4 4s4-1.8 4-4v-9c0-1.1-.9-2-2-2s-2 .9-2 2v8.5c0 .3.2.5.5.5s.5-.2.5-.5V10h1.5v7.5c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5V10c0-1.9 1.6-3.5 3.5-3.5s3.5 1.6 3.5 3.5v8c0 3-2.5 5.5-5.5 5.5S5 21 5 18v-8C5 6.1 8.1 3 12 3s7 3.1 7 7v7.5H17.5V10c0-3-2.2-5.5-5.5-5.5z" /></svg>
        </button>
        {/* Mic */}
        <button type="button" aria-label="Gravar" style={{ width: 44, height: 44, borderRadius: '50%', background: '#25D366', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.7 0 3-1.3 3-3V5c0-1.7-1.3-3-3-3S9 3.3 9 5v6c0 1.7 1.3 3 3 3zm-1-9c0-.6.4-1 1-1s1 .4 1 1v6c0 .6-.4 1-1 1s-1-.4-1-1V5zm6 6c0 2.8-2.2 5-5 5s-5-2.2-5-5H5c0 3.5 2.6 6.4 6 6.9V21h2v-3.1c3.4-.5 6-3.4 6-6.9h-2z" /></svg>
        </button>
      </div>
    </div>
  );
};
