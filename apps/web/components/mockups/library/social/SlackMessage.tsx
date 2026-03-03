'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reaction {
  emoji: string;
  count: number;
  label: string;
}

interface SlackMessageProps {
  // Studio base props - identity
  name?: string;
  username?: string;
  brandName?: string;
  workspaceName?: string;
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
  // Slack-specific
  channelName?: string;
  threadCount?: number;
  reactions?: Reaction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render message with backtick code spans and bold */
function renderMessage(msg: string) {
  const parts = msg.split(/(```[\s\S]*?```|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const code = part.slice(3, -3).trim();
      return (
        <pre
          key={i}
          style={{
            background: '#F8F8F8',
            border: '1px solid #e1e4e8',
            borderRadius: 4,
            padding: '8px 12px',
            fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: 12,
            color: '#1D1C1D',
            overflowX: 'auto',
            margin: '6px 0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {code}
        </pre>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          style={{
            background: '#F8F8F8',
            border: '1px solid #e1e4e8',
            borderRadius: 3,
            padding: '1px 5px',
            fontFamily: '"SFMono-Regular", Consolas, monospace',
            fontSize: 12,
            color: '#1D1C1D',
          }}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i}>{part.slice(1, -1)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const HashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

const SmileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </svg>
);

const ReplyIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="9 14 4 9 9 4" />
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </svg>
);

const MentionIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);

const ShareIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const DotsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// ─── Default reactions ────────────────────────────────────────────────────────

const DEFAULT_REACTIONS: Reaction[] = [
  { emoji: '👍', count: 3, label: 'Joinha' },
  { emoji: '😂', count: 2, label: 'Haha' },
  { emoji: '🎉', count: 1, label: 'Celebração' },
];

// ─── Sidebar channels ─────────────────────────────────────────────────────────

const SIDEBAR_CHANNELS = ['geral', 'random', 'design', 'dev', 'marketing'];

// ─── Component ────────────────────────────────────────────────────────────────

export const SlackMessage: React.FC<SlackMessageProps> = ({
  name,
  username,
  brandName,
  workspaceName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  channelName = 'design',
  threadCount = 3,
  reactions,
}) => {
  const displayWorkspace = workspaceName || brandName || name || 'Minha Empresa';
  const displayChannel = channelName;
  const displayName = username || name || brandName || 'Ana Souza';
  const displayMessage = body || caption || description || text || headline || title || 'Pessoal, *novidade importante*: o componente novo está pronto. Podem revisar o PR quando tiverem um tempinho? `feat/novo-componente`';
  const mediaSrc = image || postImage || thumbnail || '';
  const reactionList = reactions || DEFAULT_REACTIONS;

  const [activeReactions, setActiveReactions] = useState<Record<number, boolean>>({});
  const [reactionCounts, setReactionCounts] = useState<number[]>(reactionList.map((r) => r.count));

  const toggleReaction = (i: number) => {
    setActiveReactions((prev) => {
      const next = { ...prev, [i]: !prev[i] };
      setReactionCounts((counts) => {
        const c = [...counts];
        c[i] = reactionList[i].count + (next[i] ? 1 : 0);
        return c;
      });
      return next;
    });
  };

  return (
    <div
      style={{
        width: 380,
        maxWidth: '100%',
        background: '#ffffff',
        borderRadius: 10,
        boxShadow: '0 2px 16px rgba(0,0,0,0.10)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Lato", "Segoe UI", Helvetica, Arial, sans-serif',
        color: '#1D1C1D',
        boxSizing: 'border-box',
        display: 'flex',
      }}
    >
      {/* ── Sidebar mini ── */}
      <div
        style={{
          width: 72,
          background: '#4A154B',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '12px 0',
          flexShrink: 0,
          gap: 4,
        }}
      >
        {/* Workspace avatar */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 8,
            background: '#fff', color: '#4A154B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 16, marginBottom: 8,
            flexShrink: 0,
          }}
        >
          {displayWorkspace.charAt(0).toUpperCase()}
        </div>

        {/* Channel list */}
        {SIDEBAR_CHANNELS.map((ch) => (
          <div
            key={ch}
            style={{
              width: '100%',
              padding: '4px 8px',
              background: ch === displayChannel ? 'rgba(255,255,255,0.18)' : 'transparent',
              borderRadius: ch === displayChannel ? 4 : 0,
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: ch === displayChannel ? '#fff' : 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: ch === displayChannel ? 700 : 400 }}>
              <HashIcon />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 42 }}>
                {ch}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Channel header */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid #E8E8E8',
            background: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ color: '#1D1C1D' }}>
              <HashIcon />
            </span>
            <span style={{ fontWeight: 900, fontSize: 15, color: '#1D1C1D' }}>{displayChannel}</span>
          </div>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#696969' }}>
            Canal da equipe de {displayChannel}
          </p>
        </div>

        {/* Message area */}
        <div style={{ padding: '12px 12px 0', flex: 1 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {/* Avatar */}
            <div
              style={{
                width: 36, height: 36, borderRadius: 4,
                background: '#4A154B', overflow: 'hidden', flexShrink: 0,
              }}
            >
              {profileImage ? (
                <img src={profileImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div
                  style={{
                    width: '100%', height: '100%',
                    background: 'linear-gradient(135deg, #4A154B 0%, #7B4185 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Message content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Name + timestamp */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                <span style={{ fontWeight: 900, fontSize: 14, color: '#1D1C1D', cursor: 'pointer' }}>{displayName}</span>
                <span style={{ fontSize: 11, color: '#696969' }}>11:42</span>
              </div>

              {/* Message text */}
              <div style={{ fontSize: 14, lineHeight: '1.5', color: '#1D1C1D', wordBreak: 'break-word' }}>
                {renderMessage(displayMessage)}
              </div>

              {/* File attachment */}
              {mediaSrc && (
                <div
                  style={{
                    marginTop: 8,
                    border: '1px solid #e1e4e8',
                    borderRadius: 6,
                    overflow: 'hidden',
                    maxWidth: 220,
                  }}
                >
                  <img src={mediaSrc} alt="Anexo" style={{ width: '100%', height: 'auto', maxHeight: 120, objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '6px 10px', background: '#f8f8f8', fontSize: 11, color: '#696969' }}>
                    imagem-anexada.png
                  </div>
                </div>
              )}

              {/* Action bar */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  marginTop: 6,
                  background: '#fff',
                  border: '1px solid #e1e4e8',
                  borderRadius: 6,
                  padding: '2px 4px',
                  width: 'fit-content',
                }}
              >
                {[
                  { label: 'Adicionar reação', icon: <SmileIcon /> },
                  { label: 'Responder em thread', icon: <ReplyIcon /> },
                  { label: 'Mencionar', icon: <MentionIcon /> },
                  { label: 'Encaminhar mensagem', icon: <ShareIcon /> },
                  { label: 'Mais ações', icon: <DotsIcon /> },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    aria-label={btn.label}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: '#696969', padding: '3px 5px', lineHeight: 0,
                      borderRadius: 4,
                    }}
                  >
                    {btn.icon}
                  </button>
                ))}
              </div>

              {/* Reactions */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6, marginBottom: 8 }}>
                {reactionList.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Reagir com ${r.label}: ${reactionCounts[i]} reações`}
                    onClick={() => toggleReaction(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: activeReactions[i] ? '#E8F5FA' : '#F8F8F8',
                      border: activeReactions[i] ? '1px solid #1264A3' : '1px solid #e1e4e8',
                      borderRadius: 20,
                      padding: '2px 8px',
                      fontSize: 13,
                      cursor: 'pointer',
                      color: activeReactions[i] ? '#1264A3' : '#1D1C1D',
                      fontWeight: activeReactions[i] ? 700 : 400,
                    }}
                  >
                    <span>{r.emoji}</span>
                    <span style={{ fontSize: 12 }}>{reactionCounts[i]}</span>
                  </button>
                ))}
              </div>

              {/* Thread replies */}
              {threadCount > 0 && (
                <button
                  type="button"
                  aria-label={`Ver ${threadCount} respostas na thread`}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    marginBottom: 10, padding: 0,
                  }}
                >
                  <div style={{ display: 'flex' }}>
                    {['#4A154B', '#7B4185', '#A855F7'].slice(0, Math.min(threadCount, 3)).map((bg, j) => (
                      <div
                        key={j}
                        style={{
                          width: 18, height: 18, borderRadius: '50%',
                          background: bg,
                          border: '2px solid #fff',
                          marginLeft: j > 0 ? -5 : 0,
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: '#1264A3', fontWeight: 700 }}>
                    {threadCount} {threadCount === 1 ? 'resposta' : 'respostas'}
                  </span>
                  <span style={{ fontSize: 12, color: '#696969' }}>Ver thread</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workspace footer */}
        <div
          style={{
            padding: '8px 12px',
            borderTop: '1px solid #E8E8E8',
            background: '#F8F8F8',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <div
            style={{
              width: 18, height: 18, borderRadius: 4,
              background: '#4A154B',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 10,
            }}
          >
            {displayWorkspace.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#1D1C1D' }}>{displayWorkspace}</span>
          <span style={{ fontSize: 11, color: '#696969', marginLeft: 2 }}>· Slack</span>
        </div>
      </div>
    </div>
  );
};
