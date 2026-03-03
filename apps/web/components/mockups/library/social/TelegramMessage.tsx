'use client';

import React from 'react';

interface TelegramMessageProps {
  // Studio base aliases
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Component-specific
  isOnline?: boolean;
  timeLabel?: string;
  lastSeen?: string;
  replyTo?: string;
}

export const TelegramMessage: React.FC<TelegramMessageProps> = ({
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  isOnline = true,
  timeLabel = '10:42',
  lastSeen,
  replyTo,
}) => {
  const contactName = name ?? brandName ?? username ?? 'Nome do Contato';
  const messageText = body ?? caption ?? description ?? text ?? 'Olá! Tudo bem? Vi seu conteúdo e adorei. Poderia me contar mais sobre como funciona?';
  const messageImage = postImage ?? image ?? thumbnail ?? '';
  const avatarImage = profileImage ?? image ?? '';

  const statusText = isOnline
    ? 'online'
    : lastSeen
    ? `visto por último ${lastSeen}`
    : 'visto por último às 10:30';

  // Avatar initials fallback
  const initials = contactName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  // Subtle dot pattern for wallpaper (base64 encoded 4x4 dark pattern)
  const wallpaperStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '20px 20px',
    pointerEvents: 'none',
  };

  return (
    <div
      style={{
        width: 320,
        minHeight: 480,
        background: '#0E1621',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: '#232E3C',
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          position: 'relative',
          zIndex: 2,
        }}
      >
        {/* Back arrow */}
        <div style={{ color: '#2AABEE', fontSize: 20, cursor: 'pointer', lineHeight: 1, marginRight: 2 }}>
          ‹
        </div>

        {/* Contact avatar with online dot */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C8EAD 0%, #3E5771 100%)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {avatarImage ? (
              <img src={avatarImage} alt={contactName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          {isOnline && (
            <div
              style={{
                position: 'absolute',
                bottom: 1,
                right: 1,
                width: 9,
                height: 9,
                background: '#2AABEE',
                borderRadius: '50%',
                border: '2px solid #232E3C',
              }}
            />
          )}
        </div>

        {/* Contact info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {contactName}
          </div>
          <div
            style={{
              color: isOnline ? '#2AABEE' : '#8DABB5',
              fontSize: 11,
              marginTop: 1,
            }}
          >
            {statusText}
          </div>
        </div>

        {/* Action icons */}
        <div style={{ display: 'flex', gap: 14, color: '#8DABB5', fontSize: 17 }}>
          {/* Phone */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer' }}>
            <path
              d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"
              fill="#8DABB5"
            />
          </svg>
          {/* Video */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer' }}>
            <path
              d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"
              fill="#8DABB5"
            />
          </svg>
        </div>
      </div>

      {/* Chat area */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          padding: '10px 10px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 6,
        }}
      >
        {/* Wallpaper pattern */}
        <div style={wallpaperStyle} />

        {/* Received message (left side) as context */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              background: '#182533',
              borderRadius: '12px 12px 12px 2px',
              padding: '8px 11px',
              maxWidth: '75%',
            }}
          >
            <p style={{ color: '#E8EDF0', fontSize: 13, margin: 0, lineHeight: '1.5' }}>
              Olá! Gostaria de saber mais informações 😊
            </p>
            <div style={{ textAlign: 'right', marginTop: 3 }}>
              <span style={{ color: '#8DABB5', fontSize: 10.5 }}>10:40</span>
            </div>
          </div>
        </div>

        {/* Sent message bubble (right side) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              background: '#2B5278',
              borderRadius: '12px 12px 2px 12px',
              maxWidth: '80%',
              overflow: 'hidden',
            }}
          >
            {/* Reply indicator */}
            {replyTo && (
              <div
                style={{
                  margin: '8px 11px 0',
                  padding: '6px 10px',
                  background: 'rgba(0,0,0,0.2)',
                  borderLeft: '3px solid #2AABEE',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                <div style={{ color: '#2AABEE', fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                  {contactName}
                </div>
                <div
                  style={{
                    color: '#A8C4D8',
                    fontSize: 11.5,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 180,
                  }}
                >
                  {replyTo}
                </div>
              </div>
            )}

            {/* Optional image */}
            {messageImage && (
              <div>
                <img
                  src={messageImage}
                  alt="Imagem da mensagem"
                  style={{ width: '100%', display: 'block', maxHeight: 150, objectFit: 'cover' }}
                />
              </div>
            )}

            {/* Message text */}
            <div style={{ padding: '8px 11px 4px' }}>
              <p
                style={{
                  color: '#E8EDF0',
                  fontSize: 13.5,
                  margin: 0,
                  lineHeight: '1.55',
                  wordBreak: 'break-word',
                }}
              >
                {messageText}
              </p>
            </div>

            {/* Time + read receipt */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 4,
                padding: '2px 11px 8px',
              }}
            >
              <span style={{ color: '#A8C4D8', fontSize: 10.5 }}>{timeLabel}</span>
              {/* Double check (read) */}
              <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                <path d="M1 5L4.5 8.5L10 2" stroke="#2AABEE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 5L8.5 8.5L14 2" stroke="#2AABEE" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom input bar */}
      <div
        style={{
          background: '#232E3C',
          padding: '8px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Attachment */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, cursor: 'pointer' }}>
          <path
            d="M16.5 6.5v10a4.5 4.5 0 01-9 0V5a3 3 0 016 0v9.5a1.5 1.5 0 01-3 0V6.5"
            stroke="#8DABB5"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        {/* Text input */}
        <div
          style={{
            flex: 1,
            background: '#17212B',
            borderRadius: 20,
            padding: '8px 14px',
            color: '#8DABB5',
            fontSize: 13,
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          Mensagem
        </div>

        {/* Send button */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#2AABEE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M22 2L15 22L11 13L2 9L22 2Z"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
