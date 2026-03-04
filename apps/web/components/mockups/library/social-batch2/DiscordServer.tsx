'use client';
import React, { useState } from 'react';

interface DiscordServerProps {
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

export const DiscordServer: React.FC<DiscordServerProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image, postImage, thumbnail, profileImage,
  brandColor = '#5865F2',
  brandName,
}) => {
  const [joined, setJoined] = useState(false);
  const [activeChannel, setActiveChannel] = useState('geral');

  const displayName = name ?? username ?? brandName ?? headline ?? title ?? 'Comunidade Criativa BR';
  const displayDesc = description ?? body ?? caption ?? text ?? 'O melhor servidor para designers, devs e criadores de conteúdo do Brasil. Compartilhe projetos, tire dúvidas e faça networking!';
  const displayIcon = profileImage ?? image ?? postImage ?? thumbnail ?? '';
  const accentColor = brandColor ?? '#5865F2';

  const channels = [
    { type: 'text', name: 'bem-vindo', unread: false },
    { type: 'text', name: 'anúncios', unread: true },
    { type: 'text', name: 'geral', unread: false },
    { type: 'text', name: 'showcase', unread: true },
    { type: 'text', name: 'feedback', unread: false },
    { type: 'voice', name: 'Bate-papo Geral', users: 3 },
    { type: 'voice', name: 'Sala de Trabalho', users: 1 },
  ];

  const members = [
    { name: 'Carlos Dev', color: '#3498db', status: 'online', role: 'Admin' },
    { name: 'Mari Design', color: '#e74c3c', status: 'online', role: 'Mod' },
    { name: 'Lucas Code', color: '#2ecc71', status: 'idle', role: '' },
    { name: 'Ana Arte', color: '#f39c12', status: 'dnd', role: '' },
  ];

  const statusColors: Record<string, string> = { online: '#23A55A', idle: '#F0B232', dnd: '#ED4245' };

  return (
    <div style={{
      width: 420,
      background: '#313338',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Arial, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Banner */}
      <div style={{
        height: 90,
        background: `linear-gradient(135deg, ${accentColor} 0%, #3B3F98 100%)`,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', bottom: -28, left: 16,
          width: 56, height: 56, borderRadius: 16,
          border: '4px solid #313338',
          background: accentColor,
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {displayIcon
            ? <img src={displayIcon} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ color: '#fff', fontWeight: 700, fontSize: 22 }}>{displayName.charAt(0)}</span>
          }
        </div>
        <div style={{ position: 'absolute', top: 10, right: 12, display: 'flex', gap: 6 }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fff' }}>
            ✓ Verificado
          </div>
        </div>
      </div>

      {/* Server info */}
      <div style={{ padding: '36px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#F2F3F5', marginBottom: 4 }}>{displayName}</div>
        <div style={{ fontSize: 12, color: '#B5BAC1', lineHeight: 1.5, marginBottom: 12 }}>{displayDesc}</div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#23A55A' }} />
            <span style={{ fontSize: 12, color: '#B5BAC1' }}>1.247 online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#80848E' }} />
            <span style={{ fontSize: 12, color: '#B5BAC1' }}>8.432 membros</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={joined ? 'Sair do servidor' : 'Entrar no servidor'}
          onClick={() => setJoined(p => !p)}
          style={{
            width: '100%',
            background: joined ? '#2D2F34' : accentColor,
            border: joined ? `1px solid ${accentColor}` : 'none',
            borderRadius: 6, color: joined ? accentColor : '#fff',
            fontWeight: 700, fontSize: 14, padding: '10px 0',
            cursor: 'pointer',
          }}
        >
          {joined ? '✓ Membro do Servidor' : 'Entrar no servidor'}
        </button>
      </div>

      {/* Channel list */}
      <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ padding: '0 16px 6px', fontSize: 11, fontWeight: 700, color: '#80848E', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Canais de texto
        </div>
        {channels.filter(c => c.type === 'text').map(ch => (
          <button
            key={ch.name}
            type="button"
            aria-label={`Canal ${ch.name}`}
            onClick={() => setActiveChannel(ch.name)}
            style={{
              background: activeChannel === ch.name ? 'rgba(255,255,255,0.08)' : 'none',
              border: 'none', borderRadius: 4, margin: '1px 8px', padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
              width: 'calc(100% - 16px)',
            }}
          >
            <span style={{ fontSize: 18, color: activeChannel === ch.name ? '#DBDEE1' : '#80848E', fontWeight: 300 }}>#</span>
            <span style={{ fontSize: 13, color: activeChannel === ch.name ? '#F2F3F5' : ch.unread ? '#F2F3F5' : '#80848E', fontWeight: ch.unread ? 600 : 400, flex: 1, textAlign: 'left' }}>{ch.name}</span>
            {ch.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
          </button>
        ))}

        <div style={{ padding: '10px 16px 6px', fontSize: 11, fontWeight: 700, color: '#80848E', letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Canais de voz
        </div>
        {channels.filter(c => c.type === 'voice').map(ch => (
          <button
            key={ch.name}
            type="button"
            aria-label={`Canal de voz ${ch.name}`}
            style={{
              width: 'calc(100% - 16px)', background: 'none', border: 'none',
              borderRadius: 4, margin: '1px 8px', padding: '5px 10px',
              display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#80848E"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" stroke="#80848E" fill="none" strokeWidth="2"/></svg>
            <span style={{ fontSize: 13, color: '#80848E', flex: 1, textAlign: 'left' }}>{ch.name}</span>
            <span style={{ fontSize: 11, color: '#80848E' }}>{ch.users}</span>
          </button>
        ))}
      </div>

      {/* Online members */}
      <div style={{ padding: '10px 16px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#80848E', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
          Online — {members.length}
        </div>
        {members.map((m, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>{m.name.charAt(0)}</span>
              </div>
              <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10, borderRadius: '50%', background: statusColors[m.status], border: '2px solid #313338' }} />
            </div>
            <span style={{ fontSize: 13, color: '#B5BAC1', flex: 1 }}>{m.name}</span>
            {m.role && (
              <span style={{ fontSize: 10, color: accentColor, background: `${accentColor}22`, borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>{m.role}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
