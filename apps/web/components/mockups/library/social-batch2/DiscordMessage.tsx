'use client';
import React, { useState } from 'react';

interface DiscordMessageProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

export const DiscordMessage: React.FC<DiscordMessageProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image, postImage, thumbnail, profileImage,
  brandColor = '#5865F2',
  brandName,
}) => {
  const [reactions, setReactions] = useState<Record<string, number>>({ '👍': 3, '🔥': 7, '😂': 2 });
  const [myReactions, setMyReactions] = useState<Set<string>>(new Set());
  const [showReplyInput, setShowReplyInput] = useState(false);

  const displayName = username ?? name ?? brandName ?? headline ?? 'Gabriela#1234';
  const displayMessage = body ?? caption ?? description ?? text ?? 'Oi pessoal! Acabei de ver o novo anúncio — estou muito animada com as novidades que o servidor vai trazer esse mês. Quem mais vai participar do evento de sábado? 🎉';
  const displayAvatar = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const userColor = brandColor ?? '#5865F2';

  const roles = ['Moderadora', 'Veterana'];
  const roleColors: Record<string, string> = { 'Moderadora': '#ED4245', 'Veterana': '#F0B232' };

  const toggleReaction = (emoji: string) => {
    setMyReactions(prev => {
      const next = new Set(prev);
      if (next.has(emoji)) {
        next.delete(emoji);
        setReactions(r => ({ ...r, [emoji]: r[emoji] - 1 }));
      } else {
        next.add(emoji);
        setReactions(r => ({ ...r, [emoji]: r[emoji] + 1 }));
      }
      return next;
    });
  };

  return (
    <div style={{
      width: 480,
      background: '#313338',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      flexShrink: 0,
    }}>
      {/* Channel header */}
      <div style={{
        background: '#2B2D31',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ color: '#80848E', fontSize: 20, fontWeight: 300 }}>#</span>
        <span style={{ color: '#F2F3F5', fontWeight: 600, fontSize: 14 }}>geral</span>
        <div style={{ width: 1, height: 16, background: '#3F4147', margin: '0 4px' }} />
        <span style={{ color: '#80848E', fontSize: 12 }}>Canal principal do servidor</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
          {['🔔', '📌', '👥'].map(icon => (
            <button key={icon} type="button" aria-label={icon} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, opacity: 0.6 }}>{icon}</button>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div style={{ padding: '16px 16px 0' }}>
        {/* System message */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 11, color: '#80848E' }}>Hoje</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Main message */}
        <div style={{ display: 'flex', gap: 12, position: 'relative' }}>
          {/* Avatar with online dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: userColor, overflow: 'hidden',
            }}>
              {displayAvatar
                ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff' }}>{displayName.charAt(0)}</div>
              }
            </div>
            {/* Online dot */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 12, height: 12, borderRadius: '50%',
              background: '#23A55A',
              border: '2px solid #313338',
            }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Username + roles + timestamp */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: userColor }}>{displayName}</span>
              {roles.map(r => (
                <span key={r} style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 3, background: `${roleColors[r]}22`,
                  color: roleColors[r], border: `1px solid ${roleColors[r]}44`,
                }}>{r}</span>
              ))}
              <span style={{ fontSize: 11, color: '#4E5058' }}>Hoje às 14:32</span>
            </div>

            {/* Message text */}
            <div style={{ fontSize: 14, color: '#DBDEE1', lineHeight: 1.55, marginBottom: 8 }}>
              {displayMessage}
            </div>

            {/* Attached image */}
            {postImage && (
              <div style={{ borderRadius: 4, overflow: 'hidden', maxWidth: 340, marginBottom: 8 }}>
                <img src={postImage} alt="anexo" style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            {/* Reactions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {Object.entries(reactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Reagir com ${emoji}`}
                  onClick={() => toggleReaction(emoji)}
                  style={{
                    background: myReactions.has(emoji) ? 'rgba(88,101,242,0.25)' : 'rgba(255,255,255,0.07)',
                    border: myReactions.has(emoji) ? '1px solid #5865F2' : '1px solid transparent',
                    borderRadius: 4, padding: '3px 8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                  }}
                >
                  <span style={{ fontSize: 15 }}>{emoji}</span>
                  <span style={{ fontSize: 12, color: myReactions.has(emoji) ? '#BCC0FF' : '#B5BAC1', fontWeight: 500 }}>{count}</span>
                </button>
              ))}
              <button
                type="button"
                aria-label="Adicionar reação"
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid transparent',
                  borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#80848E', fontSize: 14,
                }}
              >😊</button>
            </div>

            {/* Thread reply */}
            <button
              type="button"
              aria-label="Ver thread de respostas"
              onClick={() => setShowReplyInput(p => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 12,
              }}
            >
              <div style={{ display: 'flex' }}>
                {['#3498db', '#e74c3c', '#2ecc71'].map((c, i) => (
                  <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: c, marginLeft: i > 0 ? -4 : 0, border: '1px solid #313338' }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#00AFF4', fontWeight: 500 }}>3 respostas</span>
              <span style={{ fontSize: 11, color: '#4E5058' }}>Última resposta hoje</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chat input */}
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{
          background: '#383A40', borderRadius: 8,
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        }}>
          <button type="button" aria-label="Adicionar anexo" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B5BAC1', fontSize: 20, padding: 0 }}>+</button>
          <span style={{ flex: 1, fontSize: 14, color: '#4E5058' }}>Mensagem em #geral</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['🎁', '😊', '🎤'].map(icon => (
              <button key={icon} type="button" aria-label={icon} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, opacity: 0.6 }}>{icon}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
