'use client';
import React, { useState } from 'react';

interface DiscordEmbedProps {
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

export const DiscordEmbed: React.FC<DiscordEmbedProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image, postImage, thumbnail, profileImage,
  brandColor = '#5865F2',
  brandName,
}) => {
  const [reacted, setReacted] = useState<string | null>(null);

  const displayBot = brandName ?? name ?? username ?? 'MemBot';
  const displayTitle = headline ?? title ?? 'Novo Comunicado do Servidor';
  const displayDesc = description ?? body ?? caption ?? text ?? 'Este é um anúncio importante para todos os membros do servidor. Por favor, leiam com atenção e reajam para confirmar que viram.';
  const displayThumb = thumbnail ?? profileImage ?? image ?? postImage ?? '';
  const accentColor = brandColor ?? '#5865F2';

  const fields = [
    { name: 'Data do evento', value: '15 de março, 2026', inline: true },
    { name: 'Horário', value: '20:00 BRT', inline: true },
    { name: 'Canal', value: '#geral-voz', inline: true },
    { name: 'Requisito', value: 'Cargo de Membro Verificado', inline: false },
  ];

  const emotes = ['👍', '❤️', '🎉', '🔥'];

  return (
    <div style={{
      width: 460,
      background: '#313338',
      borderRadius: 12,
      padding: '12px 16px',
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      flexShrink: 0,
    }}>
      {/* Bot message header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: accentColor, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {displayThumb
            ? <img src={displayThumb} alt={displayBot} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7.5 14c-.83 0-1.5.67-1.5 1.5S6.67 17 7.5 17s1.5-.67 1.5-1.5S8.33 14 7.5 14zm9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM3 20v-1a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v1H3z"/></svg>
          }
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: accentColor }}>{displayBot}</span>
            <span style={{ background: accentColor, color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, letterSpacing: 0.5 }}>BOT</span>
          </div>
          <span style={{ fontSize: 11, color: '#80848E' }}>Hoje às 20:14</span>
        </div>
      </div>

      {/* Embed card */}
      <div style={{
        background: '#2B2D31',
        borderRadius: 6,
        borderLeft: `4px solid ${accentColor}`,
        overflow: 'hidden',
      }}>
        {/* Embed header */}
        <div style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            {/* Author line */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#5865F2' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#DBDEE1' }}>Equipe de Moderação</span>
            </div>
            {/* Title */}
            <div style={{ fontSize: 15, fontWeight: 700, color: '#00AFF4', marginBottom: 6, cursor: 'pointer' }}>{displayTitle}</div>
            {/* Description */}
            <div style={{ fontSize: 13, color: '#DBDEE1', lineHeight: 1.5, marginBottom: 10 }}>{displayDesc}</div>
          </div>
          {/* Thumbnail */}
          <div style={{
            width: 64, height: 64, borderRadius: 4, flexShrink: 0,
            background: '#3a3c42', overflow: 'hidden',
          }}>
            {displayThumb
              ? <img src={displayThumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>📢</div>
            }
          </div>
        </div>

        {/* Fields grid */}
        <div style={{ padding: '0 12px', display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {fields.map((f, i) => (
            <div key={i} style={{ minWidth: f.inline ? 120 : '100%' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#DBDEE1', marginBottom: 2 }}>{f.name}</div>
              <div style={{ fontSize: 12, color: '#B5BAC1' }}>{f.value}</div>
            </div>
          ))}
        </div>

        {/* Embed image */}
        {image && (
          <div style={{ margin: '0 12px 10px', borderRadius: 4, overflow: 'hidden', maxHeight: 120 }}>
            <img src={image} alt="embed" style={{ width: '100%', objectFit: 'cover' }} />
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#5865F2' }} />
          <span style={{ fontSize: 11, color: '#80848E' }}>Servidor Oficial · 15 mar 2026</span>
        </div>
      </div>

      {/* Reactions */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {emotes.map(e => (
          <button
            key={e}
            type="button"
            aria-label={`Reagir com ${e}`}
            onClick={() => setReacted(r => r === e ? null : e)}
            style={{
              background: reacted === e ? 'rgba(88,101,242,0.3)' : 'rgba(255,255,255,0.06)',
              border: reacted === e ? '1px solid #5865F2' : '1px solid transparent',
              borderRadius: 4, padding: '3px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <span style={{ fontSize: 14 }}>{e}</span>
            <span style={{ fontSize: 12, color: reacted === e ? '#BCC0FF' : '#B5BAC1', fontWeight: 500 }}>
              {reacted === e ? '2' : '1'}
            </span>
          </button>
        ))}
        <button
          type="button"
          aria-label="Adicionar reação"
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid transparent',
            borderRadius: 4, padding: '3px 8px', cursor: 'pointer', color: '#80848E', fontSize: 14,
          }}
        >
          +
        </button>
      </div>
    </div>
  );
};
