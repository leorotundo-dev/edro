'use client';
import React, { useState } from 'react';

interface InstagramDMProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  messageText?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  headline?: string;
  replyImage?: string;
  postImage?: string;
  thumbnail?: string;
  timeLabel?: string;
  isOnline?: boolean;
  isVerified?: boolean;
  isAI?: boolean;
}

// Instagram gradient
const IG_GRADIENT = 'linear-gradient(135deg, #405DE6 0%, #833AB4 25%, #C13584 50%, #E1306C 75%, #FD1D1D 100%)';

const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" fill="#3897F0" />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

export const InstagramDM: React.FC<InstagramDMProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  messageText,
  body,
  caption,
  description,
  text,
  headline,
  replyImage,
  postImage,
  thumbnail,
  timeLabel = 'Agora',
  isOnline = true,
  isVerified = false,
  isAI = false,
}) => {
  const [message, setMessage] = useState('');
  const [liked, setLiked] = useState(false);

  const displayName = username || name || brandName || 'usuario';
  const handle = displayName.startsWith('@') ? displayName : `@${displayName}`;
  const displayAvatar = profileImage || image || '';
  const displayMessage = messageText || body || caption || description || text || headline || 'Oi! Vi seu post e adorei o conteúdo 😍';
  const displayMedia = replyImage || postImage || thumbnail || '';

  return (
    <div style={{
      width: 340,
      background: '#fff',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      color: '#262626',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      flexShrink: 0,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '12px 14px',
        borderBottom: '1px solid #F0F0F0',
        gap: 10,
      }}>
        <button type="button" aria-label="Voltar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            overflow: 'hidden', background: IG_GRADIENT,
            padding: 2,
          }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#fff', padding: 1.5 }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', background: '#F5F5F5' }}>
                {displayAvatar
                  ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (
                    <div style={{
                      width: '100%', height: '100%',
                      background: 'linear-gradient(135deg, #C13584 0%, #405DE6 100%)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: '#fff',
                    }}>
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                  )
                }
              </div>
            </div>
          </div>
          {isOnline && (
            <div style={{
              position: 'absolute', bottom: 1, right: 1,
              width: 10, height: 10, borderRadius: '50%',
              background: '#3897F0', border: '2px solid #fff',
            }} />
          )}
        </div>

        {/* Name info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#262626' }}>{handle}</span>
            {isVerified && <VerifiedBadge />}
            {isAI && (
              <span style={{
                background: '#E8F4FD', borderRadius: 4, padding: '1px 6px',
                fontSize: 10, fontWeight: 700, color: '#3897F0',
              }}>IA</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: isOnline ? '#3897F0' : '#8E8E8E', marginTop: 1 }}>
            {isOnline ? 'Ativo(a) agora' : 'Visto(a) recentemente'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <button type="button" aria-label="Chamada de vídeo" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round">
              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button type="button" aria-label="Informações" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><circle cx="12" cy="8" r="0.5" fill="#262626" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div style={{ padding: '16px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12, minHeight: 240 }}>
        {/* Time label */}
        <div style={{ textAlign: 'center', fontSize: 11, color: '#8E8E8E', marginBottom: 4 }}>
          {timeLabel}
        </div>

        {/* Received message (other person) */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
            background: '#F5F5F5', flexShrink: 0,
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #C13584, #405DE6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</div>
            }
          </div>
          <div style={{
            background: '#EFEFEF',
            borderRadius: '18px 18px 18px 4px',
            padding: '10px 14px', maxWidth: '75%',
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: 0, color: '#262626' }}>{displayMessage}</p>
          </div>
          {/* Like reaction */}
          <button
            type="button"
            aria-label="Curtir mensagem"
            onClick={() => setLiked(l => !l)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 14, opacity: liked ? 1 : 0.4 }}
          >
            {liked ? '❤️' : '🤍'}
          </button>
        </div>

        {/* Shared post preview (optional) */}
        {displayMedia && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ width: 26, height: 26, flexShrink: 0 }} />
            <div style={{
              border: '1px solid #DBDBDB', borderRadius: 12, overflow: 'hidden',
              maxWidth: '75%',
            }}>
              <img src={displayMedia} alt="Post compartilhado" style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }} />
              <div style={{ padding: '6px 10px', background: '#FAFAFA' }}>
                <div style={{ fontSize: 11, color: '#8E8E8E' }}>Post do Instagram</div>
              </div>
            </div>
          </div>
        )}

        {/* Sent message (user) — right side */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{
            background: 'linear-gradient(135deg, #405DE6 0%, #C13584 100%)',
            borderRadius: '18px 18px 4px 18px',
            padding: '10px 14px', maxWidth: '75%',
          }}>
            <p style={{ fontSize: 14, lineHeight: 1.45, margin: 0, color: '#fff' }}>
              Obrigado! Adorei também 🙏✨
            </p>
          </div>
        </div>

        {/* Seen indicator */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -6 }}>
          <span style={{ fontSize: 10, color: '#8E8E8E' }}>Visto ✓</span>
        </div>
      </div>

      {/* Input area */}
      <div style={{
        padding: '10px 12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: '1px solid #F0F0F0',
      }}>
        <button type="button" aria-label="Câmera" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#262626' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>

        <div style={{
          flex: 1, height: 38,
          background: '#F5F5F5', borderRadius: 20,
          display: 'flex', alignItems: 'center', paddingLeft: 14, paddingRight: 10,
          gap: 8,
        }}>
          <span style={{ flex: 1, fontSize: 14, color: '#8E8E8E' }}>Mensagem...</span>
          <button type="button" aria-label="Emoji" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 18, lineHeight: 1 }}>😊</button>
        </div>

        <button type="button" aria-label="Microfone" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#262626' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>
    </div>
  );
};
