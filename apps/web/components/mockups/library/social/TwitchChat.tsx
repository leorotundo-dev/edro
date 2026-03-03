'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TwitchChatProps {
  // Studio base props - identity
  name?: string;
  username?: string;
  brandName?: string;
  channelName?: string;
  // Studio base props - content
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  // Studio base props - media
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Chat-specific
  pinnedMessage?: string;
}

// ─── Static chat messages ─────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  username: string;
  color: string;
  isSub: boolean;
  text: string;
}

const DEMO_MESSAGES: ChatMessage[] = [
  { id: 1, username: 'GabrielFPS', color: '#FF6B6B', isSub: true, text: 'AAAAA que jogada!! PogChamp' },
  { id: 2, username: 'mariluzgamer', color: '#4ECDC4', isSub: false, text: 'fala streamer, tudo bem? LUL' },
  { id: 3, username: 'xKaioFenix', color: '#45B7D1', isSub: true, text: 'kkkkkkkk KEKW KEKW' },
  { id: 4, username: 'carol_plays', color: '#96CEB4', isSub: false, text: 'vim pelo clip do YouTube, muito doido' },
  { id: 5, username: 'ThunderBolt99', color: '#FFEAA7', isSub: true, text: 'OMEGALUL que isso?? foi gritando' },
  { id: 6, username: 'devzinhaBR', color: '#DDA0DD', isSub: false, text: 'boa! já era pra ele PogChamp' },
  { id: 7, username: 'lucasNoob', color: '#F0A500', isSub: true, text: 'Pog top demais, faz de novo!!' },
  { id: 8, username: 'alineTech', color: '#98D8C8', isSub: false, text: 'WutFace wtf wtf wtf wtf' },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const StarIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="#9147FF" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const SmileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const BitsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#9147FF" aria-hidden="true">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const PinIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const TwitchChat: React.FC<TwitchChatProps> = ({
  name,
  username,
  brandName,
  channelName,
  pinnedMessage,
}) => {
  const [chatInput, setChatInput] = useState('');

  const displayChannel = channelName || name || username || brandName || 'streamerbr';

  return (
    <div
      style={{
        width: 300,
        height: 500,
        background: '#18181B',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#EFEFF1',
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(0,0,0,0.40)',
      }}
    >
      {/* ── Top bar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 12px',
          borderBottom: '1px solid #3D3D3F',
          background: '#1F1F23',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#9147FF' }}>
          <ChatIcon />
        </span>
        <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>Chat ao vivo</span>
        <button
          type="button"
          aria-label="Configurações do chat"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#ADADB8', padding: 2, lineHeight: 0,
          }}
        >
          <GearIcon />
        </button>
      </div>

      {/* ── Pinned message ── */}
      {pinnedMessage && (
        <div
          style={{
            padding: '6px 12px',
            background: '#2D2D30',
            borderBottom: '1px solid #3D3D3F',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <span style={{ color: '#9147FF', flexShrink: 0, marginTop: 2 }}>
              <PinIcon />
            </span>
            <div>
              <span style={{ fontSize: 10, color: '#ADADB8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 1 }}>
                Mensagem fixada
              </span>
              <span style={{ fontSize: 13, color: '#EFEFF1' }}>{pinnedMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Chat messages ── */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {DEMO_MESSAGES.map((msg) => (
          <div key={msg.id} style={{ fontSize: 13, lineHeight: '1.5', wordBreak: 'break-word' }}>
            {/* Sub badge */}
            {msg.isSub && (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: '#2D2D30', borderRadius: 3,
                  padding: '1px 3px', marginRight: 4, verticalAlign: 'middle',
                }}
              >
                <StarIcon />
              </span>
            )}
            {/* Username */}
            <span style={{ color: msg.color, fontWeight: 700, marginRight: 2, cursor: 'pointer' }}>
              {msg.username}
            </span>
            <span style={{ color: '#ADADB8' }}>:</span>
            {' '}
            {/* Message text — highlight emotes */}
            <span style={{ color: '#EFEFF1' }}>
              {msg.text.split(/(PogChamp|LUL|KEKW|OMEGALUL|Pog|WutFace)/g).map((part, i) =>
                ['PogChamp', 'LUL', 'KEKW', 'OMEGALUL', 'Pog', 'WutFace'].includes(part) ? (
                  <span key={i} style={{ color: '#9147FF', fontWeight: 700 }}>{part}</span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </span>
          </div>
        ))}
      </div>

      {/* ── Bottom input ── */}
      <div
        style={{
          padding: '8px 10px',
          borderTop: '1px solid #3D3D3F',
          background: '#1F1F23',
          flexShrink: 0,
        }}
      >
        {/* Bits / cheer row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <BitsIcon />
          <span style={{ fontSize: 11, color: '#ADADB8' }}>Bits disponíveis</span>
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Enviar uma mensagem"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            aria-label="Campo de mensagem do chat"
            style={{
              flex: 1,
              background: '#3D3D3F',
              border: '1px solid #555558',
              borderRadius: 6,
              color: '#EFEFF1',
              padding: '6px 10px',
              fontSize: 13,
              outline: 'none',
            }}
          />
          <button
            type="button"
            aria-label="Enviar mensagem"
            style={{
              background: '#9147FF',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Chat
          </button>
          <button
            type="button"
            aria-label="Inserir emote"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#ADADB8',
              padding: 2,
              lineHeight: 0,
            }}
          >
            <SmileIcon />
          </button>
        </div>

        {/* Channel info */}
        <p style={{ margin: '6px 0 0', fontSize: 11, color: '#ADADB8', textAlign: 'center' }}>
          Chat de <span style={{ color: '#9147FF', fontWeight: 600 }}>{displayChannel}</span>
        </p>
      </div>
    </div>
  );
};
