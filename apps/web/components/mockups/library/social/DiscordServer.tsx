'use client';
import React, { useState } from 'react';

interface DiscordServerProps {
  serverName?: string;
  name?: string;
  brandName?: string;
  username?: string;
  serverIcon?: string;
  profileImage?: string;
  image?: string;
  messageText?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  headline?: string;
  channelName?: string;
  memberCount?: string | number;
  onlineCount?: string | number;
  timeLabel?: string;
  embedTitle?: string;
  embedImage?: string;
  thumbnail?: string;
  postImage?: string;
  embedColor?: string;
}

const DiscordBlurple = '#5865F2';

// Discord logo mark
const DiscordLogo = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 127.14 96.36" fill="white">
    <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z" />
  </svg>
);

// Verified server badge
const VerifiedBadge = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={DiscordBlurple}>
    <path d="M9 12l2 2 4-4M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill={DiscordBlurple} />
    <path d="M8.5 12.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

// Hash icon
const HashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E9297" strokeWidth="2" strokeLinecap="round">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

export const DiscordServer: React.FC<DiscordServerProps> = ({
  serverName,
  name,
  brandName,
  username,
  serverIcon,
  profileImage,
  image,
  messageText,
  body,
  caption,
  description,
  text,
  headline,
  channelName = 'geral',
  memberCount = '1.234',
  onlineCount = '342',
  timeLabel = 'Hoje às 14:32',
  embedTitle,
  embedImage,
  thumbnail,
  postImage,
  embedColor = DiscordBlurple,
}) => {
  const [liked, setLiked] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const displayServer = serverName || name || brandName || 'Servidor';
  const displayUser = username || brandName || name || 'usuario';
  const displayAvatar = profileImage || image || serverIcon || '';
  const displayMessage = messageText || body || caption || description || text || headline || 'Olá a todos! 👋 Bem-vindos ao servidor.';
  const displayEmbed = embedTitle || headline || '';
  const displayEmbedImage = embedImage || thumbnail || postImage || '';

  const REACTIONS = ['👍', '❤️', '🔥', '🎉', '😂', '🤩'];

  return (
    <div style={{
      width: 380,
      background: '#36393F',
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
      color: '#DCDDDE',
      boxShadow: '0 12px 48px rgba(0,0,0,0.65)',
      flexShrink: 0,
    }}>
      {/* Top bar / server header */}
      <div style={{
        background: '#2F3136',
        borderBottom: '1px solid rgba(0,0,0,0.2)',
        padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Server icon */}
          <div style={{
            width: 36, height: 36, borderRadius: 12,
            overflow: 'hidden', background: DiscordBlurple,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayServer} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <DiscordLogo size={20} />
            }
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{displayServer}</span>
              <VerifiedBadge />
            </div>
            <div style={{ fontSize: 11, color: '#8E9297', marginTop: 1 }}>
              <span style={{ color: '#3BA55C' }}>● </span>{onlineCount} online
              {' · '}
              <span>{memberCount} membros</span>
            </div>
          </div>
        </div>
        <button type="button" aria-label="Convidar" style={{
          background: DiscordBlurple, border: 'none', borderRadius: 4,
          color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px',
          cursor: 'pointer',
        }}>
          Entrar
        </button>
      </div>

      {/* Sidebar + channel header */}
      <div style={{ display: 'flex' }}>
        {/* Mini sidebar */}
        <div style={{
          width: 72, background: '#2F3136',
          borderRight: '1px solid rgba(0,0,0,0.2)',
          padding: '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          {['💬', '🔊', '📢', '🎮', '❓'].map((emoji, i) => (
            <div key={i} style={{
              width: 56, height: 32,
              borderRadius: 4,
              background: i === 0 ? 'rgba(255,255,255,0.1)' : 'transparent',
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '0 6px', cursor: 'pointer',
            }}>
              <span style={{ fontSize: 14 }}>{emoji}</span>
            </div>
          ))}
        </div>

        {/* Main chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Channel header */}
          <div style={{
            padding: '8px 14px',
            borderBottom: '1px solid rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <HashIcon />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{channelName}</span>
          </div>

          {/* Messages area */}
          <div style={{ padding: '10px 14px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Message */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: `hsl(${displayUser.charCodeAt(0) * 5 % 360}, 60%, 50%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#fff', flexShrink: 0,
                overflow: 'hidden',
              }}>
                {displayAvatar
                  ? <img src={displayAvatar} alt={displayUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : displayUser.charAt(0).toUpperCase()
                }
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Username + time */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{displayUser}</span>
                  <span style={{ fontSize: 11, color: '#72767D' }}>{timeLabel}</span>
                </div>

                {/* Message text */}
                <p style={{ fontSize: 14, lineHeight: 1.5, color: '#DCDDDE', margin: 0, marginBottom: 6 }}>
                  {displayMessage}
                </p>

                {/* Embed (optional) */}
                {(displayEmbed || displayEmbedImage) && (
                  <div style={{
                    borderLeft: `4px solid ${embedColor}`,
                    background: '#2F3136',
                    borderRadius: '0 4px 4px 0',
                    padding: '8px 12px',
                    marginBottom: 6,
                    maxWidth: 280,
                  }}>
                    {displayEmbed && (
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: displayEmbedImage ? 6 : 0 }}>
                        {displayEmbed}
                      </div>
                    )}
                    {displayEmbedImage && (
                      <img src={displayEmbedImage} alt="" style={{ width: '100%', borderRadius: 4, display: 'block', maxHeight: 120, objectFit: 'cover' }} />
                    )}
                  </div>
                )}

                {/* Reactions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {REACTIONS.slice(0, 3).map((emoji, i) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`Reação ${emoji}`}
                      onClick={() => setLiked(l => !l)}
                      style={{
                        background: i === 0 && liked ? 'rgba(88,101,242,0.3)' : 'rgba(0,0,0,0.3)',
                        border: i === 0 && liked ? `1px solid ${DiscordBlurple}88` : '1px solid transparent',
                        borderRadius: 4,
                        padding: '2px 6px',
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer', color: '#DCDDDE', fontSize: 13,
                      }}
                    >
                      <span>{emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 && liked ? '#BCC0FF' : '#DCDDDE' }}>
                        {i === 0 ? (liked ? 3 : 2) : i === 1 ? 1 : 4}
                      </span>
                    </button>
                  ))}
                  {/* Add reaction */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      aria-label="Adicionar reação"
                      onClick={() => setShowEmoji(p => !p)}
                      style={{
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid transparent',
                        borderRadius: 4, padding: '2px 6px',
                        cursor: 'pointer', color: '#8E9297', fontSize: 14,
                      }}
                    >
                      +
                    </button>
                    {showEmoji && (
                      <div style={{
                        position: 'absolute', bottom: 30, left: 0,
                        background: '#18191C', borderRadius: 8, padding: '8px 10px',
                        display: 'flex', gap: 6,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 20,
                      }}>
                        {REACTIONS.map(e => (
                          <button
                            key={e}
                            type="button"
                            aria-label={`Reagir com ${e}`}
                            onClick={() => { setLiked(true); setShowEmoji(false); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: 2 }}
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div style={{
            margin: '6px 14px 14px',
            background: '#40444B',
            borderRadius: 8,
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <button type="button" aria-label="Adicionar anexo" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#8E9297' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>
            <span style={{ flex: 1, fontSize: 14, color: '#72767D' }}>Mensagem #{channelName}</span>
            <button type="button" aria-label="Emoji" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, color: '#8E9297', fontSize: 18 }}>
              😊
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
