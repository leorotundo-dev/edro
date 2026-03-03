'use client';

import React, { useState } from 'react';

interface ReactionItem {
  emoji: string;
  count: number;
}

interface TelegramChannelProps {
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
  subscriberCount?: string;
  viewCount?: string;
  reactions?: ReactionItem[];
  timeLabel?: string;
  isVerified?: boolean;
}

const DEFAULT_REACTIONS: ReactionItem[] = [
  { emoji: '👍', count: 142 },
  { emoji: '🔥', count: 87 },
  { emoji: '❤️', count: 63 },
  { emoji: '🎉', count: 31 },
];

export const TelegramChannel: React.FC<TelegramChannelProps> = ({
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
  subscriberCount = '12,4 mil membros',
  viewCount = '2,3 mil',
  reactions = DEFAULT_REACTIONS,
  timeLabel = '10:42',
  isVerified = true,
}) => {
  const channelName = name ?? brandName ?? username ?? 'Nome do Canal';
  const messageText = body ?? caption ?? description ?? text ?? 'Conteúdo da publicação do canal aparece aqui. Compartilhe notícias, atualizações e novidades com seus seguidores.';
  const coverImage = postImage ?? image ?? thumbnail ?? profileImage ?? '';
  const avatarImage = profileImage ?? image ?? '';

  const [activeReactions, setActiveReactions] = useState<Set<number>>(new Set());
  const [reactionCounts, setReactionCounts] = useState<ReactionItem[]>(reactions);

  const toggleReaction = (index: number) => {
    setActiveReactions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setReactionCounts((rc) =>
          rc.map((r, i) => (i === index ? { ...r, count: r.count - 1 } : r))
        );
      } else {
        next.add(index);
        setReactionCounts((rc) =>
          rc.map((r, i) => (i === index ? { ...r, count: r.count + 1 } : r))
        );
      }
      return next;
    });
  };

  // Avatar initials fallback
  const initials = channelName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 340,
        minHeight: 500,
        background: '#17212B',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: '#232E3C',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        {/* Back arrow */}
        <div style={{ color: '#2AABEE', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>
          ‹
        </div>

        {/* Channel avatar */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2AABEE 0%, #1A7AB5 100%)',
            flexShrink: 0,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
          }}
        >
          {avatarImage ? (
            <img src={avatarImage} alt={channelName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>

        {/* Channel info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 130,
              }}
            >
              {channelName}
            </span>
            {isVerified && (
              <span
                title="Verificado"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#2AABEE',
                  borderRadius: '50%',
                  width: 14,
                  height: 14,
                  fontSize: 8,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                ✓
              </span>
            )}
          </div>
          <div style={{ color: '#8DABB5', fontSize: 11, marginTop: 1 }}>
            {subscriberCount}
          </div>
        </div>

        {/* Icons */}
        <div style={{ display: 'flex', gap: 12, color: '#8DABB5', fontSize: 17 }}>
          <span style={{ cursor: 'pointer' }}>🔍</span>
          <span style={{ cursor: 'pointer', fontSize: 18, letterSpacing: -1 }}>⋮</span>
        </div>
      </div>

      {/* Scrollable area */}
      <div
        style={{
          flex: 1,
          padding: '12px 10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Post bubble */}
        <div
          style={{
            background: '#182533',
            borderRadius: 12,
            overflow: 'hidden',
            maxWidth: '92%',
            alignSelf: 'flex-start',
          }}
        >
          {/* Bubble header (channel name inside bubble) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 12px 6px',
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2AABEE 0%, #1A7AB5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {avatarImage ? (
                <img src={avatarImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                initials
              )}
            </div>
            <span style={{ color: '#2AABEE', fontSize: 12, fontWeight: 600 }}>
              {channelName}
            </span>
          </div>

          {/* Optional image */}
          {coverImage && (
            <div style={{ width: '100%' }}>
              <img
                src={coverImage}
                alt="Imagem da publicação"
                style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Message text */}
          <div style={{ padding: '8px 12px 4px' }}>
            <p
              style={{
                color: '#E8EDF0',
                fontSize: 13.5,
                lineHeight: '1.55',
                margin: 0,
                wordBreak: 'break-word',
              }}
            >
              {messageText}
            </p>
          </div>

          {/* Bubble footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              padding: '4px 12px 9px',
            }}
          >
            {/* Views */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#8DABB5', fontSize: 11 }}>
              <svg width="13" height="9" viewBox="0 0 13 9" fill="none">
                <path
                  d="M6.5 0C3.5 0 1 2.1 0 4.5 1 6.9 3.5 9 6.5 9S12 6.9 13 4.5C12 2.1 9.5 0 6.5 0zm0 7.5c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zm0-4.8c-.99 0-1.8.81-1.8 1.8s.81 1.8 1.8 1.8 1.8-.81 1.8-1.8-.81-1.8-1.8-1.8z"
                  fill="#8DABB5"
                />
              </svg>
              {viewCount}
            </div>
            {/* Time */}
            <span style={{ color: '#8DABB5', fontSize: 11 }}>{timeLabel}</span>
            {/* Share */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ cursor: 'pointer' }}>
              <path
                d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118zM2 6a2 2 0 012-2h12a2 2 0 012 2v.382l-8 4-8-4V6z"
                fill="#2AABEE"
              />
            </svg>
          </div>
        </div>

        {/* Reaction bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 2,
            paddingLeft: 4,
          }}
        >
          {reactionCounts.map((reaction, index) => (
            <button
              type="button"
              key={index}
              onClick={() => toggleReaction(index)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: activeReactions.has(index) ? 'rgba(42,171,238,0.2)' : 'rgba(255,255,255,0.07)',
                border: activeReactions.has(index) ? '1px solid rgba(42,171,238,0.5)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '3px 9px',
                cursor: 'pointer',
                fontSize: 13,
                color: activeReactions.has(index) ? '#2AABEE' : '#C8D8E0',
                transition: 'all 0.15s ease',
                lineHeight: 1,
              }}
            >
              <span>{reaction.emoji}</span>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{reaction.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          padding: '10px 14px 14px',
          background: '#17212B',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <button
          type="button"
          style={{
            width: '100%',
            background: '#2AABEE',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '11px 0',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: 0.2,
          }}
        >
          Entrar no Canal
        </button>
      </div>
    </div>
  );
};
