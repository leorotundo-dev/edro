import React from 'react';

interface WhatsAppStatusProps {
  contactName?: string;
  name?: string;
  username?: string;
  contactImage?: string;
  profileImage?: string;
  statusImage?: string;
  image?: string;
  storyImage?: string;
  postImage?: string;
  arteHeadline?: string;
  headline?: string;
  arteBody?: string;
  body?: string;
  arteBgColor?: string;
  timeAgo?: string;
  totalSegments?: number;
  activeSegment?: number;
}

export const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({
  contactName,
  name,
  username,
  contactImage,
  profileImage,
  statusImage,
  image,
  storyImage,
  postImage,
  arteHeadline,
  headline,
  arteBody,
  body,
  arteBgColor,
  timeAgo = '2h atrás',
  totalSegments = 3,
  activeSegment = 0,
}) => {
  const displayName = name || contactName || username || 'Contato';
  const displayImage = contactImage || profileImage || '';
  const media = statusImage || storyImage || image || postImage || '';
  const resolvedHeadline = arteHeadline || headline;
  const resolvedBody = arteBody || body;
  const accentColor = arteBgColor || '#25D366';
  const segments = Math.max(1, totalSegments);

  return (
    <div style={{ position: 'relative', width: 320, height: 568, background: '#111B21', borderRadius: 16, overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

      {/* Background */}
      {media ? (
        <img src={media} alt="Status" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : resolvedHeadline ? (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg, #0f172a 0%, ${accentColor}44 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 28px 100px', textAlign: 'center' }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: accentColor, marginBottom: 16 }} />
          <p style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.25, margin: '0 0 10px', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{resolvedHeadline}</p>
          {resolvedBody && <p style={{ fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedBody}</p>}
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, #005C4B 0%, #111B21 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Mídia Vertical 9:16</span>
        </div>
      )}

      {/* Top gradient */}
      <div style={{ position: 'absolute', top: 0, width: '100%', height: 120, background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 10 }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, width: '100%', zIndex: 20, padding: '12px 12px 0' }}>

        {/* Progress segments */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
          {Array.from({ length: segments }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 2, borderRadius: 2, background: i <= activeSegment ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)' }} />
          ))}
        </div>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Avatar */}
            <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: '2px solid #25D366', background: '#2A3942', flexShrink: 0 }}>
              {displayImage ? (
                <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#8696A0"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" /></svg>
                </div>
              )}
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, margin: 0, lineHeight: '18px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{displayName}</p>
              <p style={{ fontSize: 12, margin: 0, color: 'rgba(255,255,255,0.75)', lineHeight: '16px' }}>{timeAgo}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {/* Mute */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
            {/* Close */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom gradient */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 100, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)', pointerEvents: 'none', zIndex: 10 }} />

      {/* Bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, width: '100%', zIndex: 20, padding: '0 10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 44, borderRadius: 22, border: '1.5px solid rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', padding: '0 16px', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Responder…</span>
        </div>
        {/* Emoji */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" /><path d="M8 13s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        {/* Forward/share */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
    </div>
  );
};
