'use client';

import React, { useState } from 'react';

interface FacebookPollProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  profileImage?: string;
  question?: string;
  options?: string[];
  totalVotes?: number;
  expiryLabel?: string;
  timeAgo?: string;
}

export const FacebookPoll: React.FC<FacebookPollProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  profileImage,
  question,
  options,
  totalVotes = 312,
  expiryLabel = '2 dias restantes',
  timeAgo = '1 h',
}) => {
  const resolvedAuthor = name ?? username ?? brandName ?? 'Fulano de Tal';
  const resolvedQuestion = question ?? headline ?? title ?? body ?? caption ?? description ?? text ?? 'Qual é a sua opinião?';
  const resolvedOptions = options && options.length >= 2 ? options : ['Com certeza sim', 'Talvez', 'Não acho'];

  const initVotes = resolvedOptions.map((_, i) => {
    const base = [58, 27, 15];
    return base[i] ?? Math.floor(Math.random() * 30 + 5);
  });

  const [voted, setVoted] = useState<number | null>(null);
  const [voteCounts, setVoteCounts] = useState<number[]>(initVotes);

  const handleVote = (idx: number) => {
    if (voted !== null) return;
    setVoted(idx);
    setVoteCounts((prev) => prev.map((v, i) => (i === idx ? v + 1 : v)));
  };

  const totalWithVote = voteCounts.reduce((a, b) => a + b, 0);
  const getPercent = (idx: number) => Math.round((voteCounts[idx] / totalWithVote) * 100);

  const colors = ['#1877f2', '#42a4ff', '#74bcff', '#a8d4ff'];

  return (
    <div style={{
      width: 400,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fbpoll-bar { from { width: 0%; } to { width: var(--bar-w); } }
        .fbpoll-bar-fill { animation: fbpoll-bar 0.6s ease-out forwards; }
        .fbpoll-option-btn { transition: background 0.15s; }
        .fbpoll-option-btn:hover:not(:disabled) { filter: brightness(0.97); }
      `}</style>

      {/* Post header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 8px' }}>
        <div style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          background: '#bcc0c4',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {profileImage ? (
            <img src={profileImage} alt={resolvedAuthor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #1877f2, #42a4ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{resolvedAuthor.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#050505' }}>{resolvedAuthor}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#65676b' }}>
            <span>{timeAgo}</span>
            <span>·</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#65676b">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" stroke="#fff" strokeWidth="1.5" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="#65676b" />
            </svg>
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '4px 16px 14px' }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#050505', lineHeight: 1.4 }}>{resolvedQuestion}</p>
      </div>

      {/* Poll options */}
      <div style={{ padding: '0 16px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resolvedOptions.map((opt, idx) => {
          const pct = voted !== null ? getPercent(idx) : null;
          const isWinner = voted !== null && pct === Math.max(...resolvedOptions.map((_, i) => getPercent(i)));
          const isVoted = voted === idx;

          return (
            <button
              key={idx}
              type="button"
              aria-label={`Votar em: ${opt}`}
              className="fbpoll-option-btn"
              disabled={voted !== null}
              onClick={() => handleVote(idx)}
              style={{
                position: 'relative',
                width: '100%',
                padding: '10px 12px',
                border: isVoted ? `2px solid ${colors[idx % colors.length]}` : '2px solid #e4e6eb',
                borderRadius: 8,
                background: '#fff',
                cursor: voted !== null ? 'default' : 'pointer',
                textAlign: 'left',
                overflow: 'hidden',
              }}
            >
              {/* Bar fill (shown after voting) */}
              {voted !== null && pct !== null && (
                <div
                  className="fbpoll-bar-fill"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isVoted
                      ? `${colors[idx % colors.length]}22`
                      : '#f0f2f5',
                    borderRadius: 6,
                    // @ts-ignore CSS custom property
                    '--bar-w': `${pct}%`,
                    width: `${pct}%`,
                  }}
                />
              )}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: isVoted ? 700 : 500, color: '#050505' }}>
                  {isWinner && voted !== null && '🏆 '}{opt}
                </span>
                {voted !== null && pct !== null && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: colors[idx % colors.length], flexShrink: 0 }}>{pct}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 16px 14px',
        borderTop: '1px solid #e4e6eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 13, color: '#65676b' }}>
          {totalWithVote.toLocaleString('pt-BR')} votos
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#65676b' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {expiryLabel}
        </div>
      </div>
    </div>
  );
};
