'use client';
import React, { useState } from 'react';

interface WhatsAppChannelProps {
  channelName?: string;
  name?: string;
  brandName?: string;
  username?: string;
  channelAvatar?: string;
  profileImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  messageText?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  headline?: string;
  followersCount?: string | number;
  timeLabel?: string;
  isVerified?: boolean;
  reactions?: { emoji: string; count: number }[];
}

const WhatsAppGreen = '#25D366';
const WA_BG = '#111B21';
const WA_SURFACE = '#1F2C34';
const WA_BUBBLE = '#202C33';

// WhatsApp logo (simplified)
const WhatsAppLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill={WhatsAppGreen} />
    <path
      d="M23.5 8.4A10.3 10.3 0 0 0 16 5.4a10.4 10.4 0 0 0-9 15.6L5.4 26.6l5.8-1.5A10.4 10.4 0 0 0 16 26.4a10.4 10.4 0 0 0 7.5-17.9zM16 24.6a8.6 8.6 0 0 1-4.4-1.2l-.3-.2-3.4.9.9-3.3-.2-.3A8.7 8.7 0 1 1 16 24.6zm4.8-6.5c-.3-.1-1.6-.8-1.8-.9-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.4-1.4-.9-.8-1.5-1.7-1.6-2-.2-.3 0-.5.1-.6l.5-.5.2-.4v-.4l-.9-2c-.2-.5-.5-.5-.7-.5h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.9 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.6-.7 1.8-1.3.2-.6.2-1.2.2-1.3 0-.2-.2-.3-.5-.4z"
      fill="white"
    />
  </svg>
);

// Verified badge (WhatsApp channel)
const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={WhatsAppGreen}>
    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Megaphone icon
const MegaphoneIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l19-9-9 19-2-8-8-2z" />
  </svg>
);

// Mute icon
const BellOffIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13.73 21a2 2 0 01-3.46 0" />
    <path d="M18.63 13A17.89 17.89 0 0118 8M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14" />
    <path d="M18 8a6 6 0 00-9.33-5" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// Share icon
const ShareIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

// Reaction emoji defaults
const DEFAULT_REACTIONS = [
  { emoji: '❤️', count: 48 },
  { emoji: '🔥', count: 23 },
  { emoji: '👏', count: 15 },
];

export const WhatsAppChannel: React.FC<WhatsAppChannelProps> = ({
  channelName,
  name,
  brandName,
  username,
  channelAvatar,
  profileImage,
  image,
  postImage,
  thumbnail,
  messageText,
  body,
  caption,
  description,
  text,
  headline,
  followersCount = '12.4 mil',
  timeLabel = 'Agora',
  isVerified = true,
  reactions,
}) => {
  const [followed, setFollowed] = useState(true);
  const [muted, setMuted] = useState(false);
  const [reacted, setReacted] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const displayName = channelName || name || brandName || username || 'Canal';
  const displayAvatar = channelAvatar || profileImage || image || '';
  const displayMedia = postImage || thumbnail || '';
  const displayText = messageText || body || caption || description || text || headline || '';

  const followersLabel =
    typeof followersCount === 'number'
      ? followersCount.toLocaleString('pt-BR')
      : followersCount;

  const displayReactions = reactions || DEFAULT_REACTIONS;

  // Merge reacted emoji into the list
  const mergedReactions = displayReactions.map(r => ({
    ...r,
    count: r.emoji === reacted ? r.count + 1 : r.count,
  }));

  const PICKER_EMOJIS = ['❤️', '🔥', '👏', '😮', '😂', '🎉'];

  return (
    <div style={{
      width: 340,
      background: WA_BG,
      borderRadius: 18,
      overflow: 'hidden',
      fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
      color: '#E9EDF0',
      boxShadow: '0 12px 48px rgba(0,0,0,0.65)',
      flexShrink: 0,
    }}>
      {/* Top bar */}
      <div style={{
        background: WA_SURFACE,
        display: 'flex',
        alignItems: 'center',
        padding: '10px 14px',
        gap: 10,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {/* Back arrow */}
        <button type="button" aria-label="Voltar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#8696A0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          overflow: 'hidden', background: '#2A3942', flexShrink: 0,
          border: `2px solid ${WhatsAppGreen}44`,
        }}>
          {displayAvatar
            ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${WhatsAppGreen}44 0%, #128C7E 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: WhatsAppGreen, fontSize: 18,
              }}>
                <MegaphoneIcon size={18} />
              </div>
            )
          }
        </div>
        {/* Name + followers */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#E9EDF0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
            {isVerified && <VerifiedBadge />}
          </div>
          <div style={{ fontSize: 11.5, color: '#8696A0', marginTop: 1 }}>
            {followersLabel} seguidores
          </div>
        </div>
        {/* Right icons */}
        <div style={{ display: 'flex', gap: 14, color: '#8696A0' }}>
          <WhatsAppLogo size={20} />
          <button
            type="button"
            aria-label="Silenciar canal"
            onClick={() => setMuted(m => !m)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: muted ? WhatsAppGreen : '#8696A0' }}
          >
            <BellOffIcon size={18} />
          </button>
        </div>
      </div>

      {/* Channel header card */}
      <div style={{
        margin: '12px 12px 0',
        background: WA_SURFACE,
        borderRadius: 10,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* Banner area */}
        <div style={{
          height: 72,
          background: `linear-gradient(135deg, #0D5C3A 0%, #128C7E 50%, ${WhatsAppGreen} 100%)`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Decorative circles */}
          <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ position: 'absolute', top: 10, right: 60, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        </div>

        {/* Avatar + info below banner */}
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -22, marginBottom: 10 }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              overflow: 'hidden', background: '#1F2C34',
              border: `3px solid ${WA_SURFACE}`,
              flexShrink: 0,
            }}>
              {displayAvatar
                ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (
                  <div style={{
                    width: '100%', height: '100%',
                    background: `linear-gradient(135deg, ${WhatsAppGreen}55 0%, #128C7E 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: WhatsAppGreen,
                  }}>
                    <MegaphoneIcon size={20} />
                  </div>
                )
              }
            </div>
            {/* Follow / Following button */}
            <button
              type="button"
              aria-label={followed ? 'Seguindo' : 'Seguir'}
              onClick={() => setFollowed(f => !f)}
              style={{
                background: followed ? 'transparent' : WhatsAppGreen,
                border: `1.5px solid ${followed ? '#3A4A54' : WhatsAppGreen}`,
                borderRadius: 20,
                color: followed ? '#8696A0' : '#111B21',
                fontSize: 13,
                fontWeight: 600,
                padding: '5px 16px',
                cursor: 'pointer',
                marginBottom: 2,
              }}
            >
              {followed ? 'Seguindo' : 'Seguir'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#E9EDF0' }}>{displayName}</span>
            {isVerified && <VerifiedBadge />}
          </div>
          <div style={{ fontSize: 12, color: '#8696A0', marginTop: 3 }}>
            {followersLabel} seguidores · Canal oficial
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ padding: '10px 12px 6px' }}>
        {/* Message bubble */}
        <div style={{
          background: WA_BUBBLE,
          borderRadius: '4px 12px 12px 12px',
          padding: '8px 10px 4px',
          marginBottom: 4,
          position: 'relative',
          maxWidth: '90%',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Tail */}
          <div style={{
            position: 'absolute', top: 0, left: -8,
            width: 0, height: 0,
            borderTop: `8px solid ${WA_BUBBLE}`,
            borderLeft: '8px solid transparent',
          }} />

          {/* Image in message */}
          {displayMedia && (
            <div style={{
              borderRadius: 8, overflow: 'hidden', marginBottom: 8,
              background: '#2A3942',
            }}>
              <img src={displayMedia} alt="" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
            </div>
          )}

          {/* Text */}
          {displayText && (
            <p style={{
              fontSize: 14, lineHeight: 1.5, color: '#E9EDF0',
              margin: '0 0 6px', whiteSpace: 'pre-wrap',
            }}>
              {displayText}
            </p>
          )}

          {/* Time + channel label */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, alignItems: 'center', marginTop: 2 }}>
            <span style={{ fontSize: 10.5, color: '#8696A0' }}>{timeLabel}</span>
            {/* Double check (read) */}
            <svg width="14" height="10" viewBox="0 0 18 12" fill="none">
              <path d="M1 6l4 4L11 1" stroke={WhatsAppGreen} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M7 6l4 4 6-9" stroke={WhatsAppGreen} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Reactions bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {mergedReactions.map(r => (
            <button
              key={r.emoji}
              type="button"
              aria-label={`Reagir com ${r.emoji}`}
              onClick={() => setReacted(prev => prev === r.emoji ? null : r.emoji)}
              style={{
                background: reacted === r.emoji ? `${WhatsAppGreen}22` : 'rgba(255,255,255,0.07)',
                border: `1px solid ${reacted === r.emoji ? WhatsAppGreen + '66' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 16,
                padding: '3px 8px',
                display: 'flex', alignItems: 'center', gap: 4,
                cursor: 'pointer', fontSize: 13,
              }}
            >
              <span>{r.emoji}</span>
              <span style={{ fontSize: 11.5, color: '#8696A0' }}>{r.count}</span>
            </button>
          ))}

          {/* Add reaction button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Adicionar reação"
              onClick={() => setShowEmojiPicker(p => !p)}
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16, width: 32, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#8696A0', fontSize: 15,
              }}
            >
              +
            </button>
            {showEmojiPicker && (
              <div style={{
                position: 'absolute', bottom: 34, left: 0,
                background: '#2A3942',
                borderRadius: 12, padding: '6px 8px',
                display: 'flex', gap: 6,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                zIndex: 20,
              }}>
                {PICKER_EMOJIS.map(e => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`Reagir com ${e}`}
                    onClick={() => { setReacted(e); setShowEmojiPicker(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 2 }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        background: WA_SURFACE,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Share button */}
        <button
          type="button"
          aria-label="Compartilhar canal"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: '6px 14px',
            color: '#8696A0', fontSize: 13, cursor: 'pointer',
          }}
        >
          <ShareIcon size={14} />
          <span>Compartilhar</span>
        </button>

        {/* Notification + follow actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            aria-label={muted ? 'Ativar notificações' : 'Silenciar'}
            onClick={() => setMuted(m => !m)}
            style={{
              width: 34, height: 34,
              background: muted ? `${WhatsAppGreen}22` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${muted ? WhatsAppGreen + '55' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: muted ? WhatsAppGreen : '#8696A0',
            }}
          >
            <BellOffIcon size={15} />
          </button>

          <button
            type="button"
            aria-label={followed ? 'Parar de seguir' : 'Seguir canal'}
            onClick={() => setFollowed(f => !f)}
            style={{
              height: 34, borderRadius: 20, padding: '0 16px',
              background: followed ? WhatsAppGreen : 'transparent',
              border: `1.5px solid ${followed ? WhatsAppGreen : '#3A4A54'}`,
              color: followed ? '#111B21' : '#8696A0',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {followed ? 'Seguindo' : 'Seguir'}
          </button>
        </div>
      </div>
    </div>
  );
};
