'use client';

import React, { useState } from 'react';

interface FacebookPostProps {
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

export const FacebookPost: React.FC<FacebookPostProps> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  brandName,
}) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(87);
  const [expanded, setExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');

  const resolvedName = name ?? username ?? brandName ?? headline ?? title ?? 'Leonardo Rocha';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Hoje foi um dia incrível! Compartilhando esse momento especial com todos vocês. Gratidão por cada apoio e mensagem recebida. 🙏✨';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  const isLong = resolvedBody.length > 120;
  const displayBody = isLong && !expanded ? resolvedBody.slice(0, 120) + '…' : resolvedBody;

  const handleLike = () => {
    setLiked((p) => !p);
    setLikeCount((p) => (liked ? p - 1 : p + 1));
  };

  return (
    <div style={{
      width: 500,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fb-post-in { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        .fb-post-root { animation: fb-post-in 0.3s ease; }
        .fb-post-action:hover { background: #f0f2f5 !important; }
        .fb-post-like:hover { background: #e7f3ff !important; }
        .fb-post-more:hover { color: #050505 !important; }
        .fb-post-input:focus { outline: none; }
      `}</style>

      <div className="fb-post-root">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%',
              background: resolvedAvatar ? 'transparent' : resolvedColor,
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {resolvedAvatar
                ? <img src={resolvedAvatar} alt={resolvedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 700, fontSize: 17 }}>{resolvedName.charAt(0).toUpperCase()}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#050505', lineHeight: 1.3 }}>{resolvedName}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                <span style={{ fontSize: 12, color: '#65676b' }}>há 2 horas</span>
                <span style={{ fontSize: 12, color: '#65676b' }}>·</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#65676b">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
              </div>
            </div>
          </div>
          <button type="button" aria-label="Opções da publicação" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#65676b', fontSize: 20, letterSpacing: 1, borderRadius: 6, padding: '4px 8px' }}>···</button>
        </div>

        {/* Post text */}
        <div style={{ padding: '0 16px 12px', fontSize: 15, color: '#050505', lineHeight: 1.5 }}>
          {displayBody}
          {isLong && (
            <button
              type="button"
              aria-label={expanded ? 'Ver menos' : 'Ver mais'}
              className="fb-post-more"
              onClick={() => setExpanded((p) => !p)}
              style={{ background: 'none', border: 'none', color: '#65676b', fontWeight: 700, fontSize: 14, cursor: 'pointer', paddingLeft: 4 }}
            >
              {expanded ? 'Ver menos' : 'Ver mais'}
            </button>
          )}
        </div>

        {/* Post image */}
        {resolvedImage ? (
          <div style={{ width: '100%', maxHeight: 340, overflow: 'hidden' }}>
            <img src={resolvedImage} alt="Publicação" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        ) : (
          <div style={{
            width: '100%', height: 260,
            background: 'linear-gradient(135deg, #f0f2f5 0%, #e4e6eb 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#bcc0c4" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Reaction count */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ display: 'flex' }}>
              {['#1877f2', '#f5533d', '#f7b928'].map((c, i) => (
                <div key={i} style={{
                  width: 18, height: 18, borderRadius: '50%', background: c,
                  border: '2px solid #fff', marginLeft: i > 0 ? -5 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                }}>
                  {i === 0 && '👍'}{i === 1 && '❤️'}{i === 2 && '😮'}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#65676b' }}>{likeCount.toLocaleString('pt-BR')}</span>
          </div>
          <span style={{ fontSize: 13, color: '#65676b', cursor: 'pointer' }}>18 comentários · 3 compartilhamentos</span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', borderTop: '1px solid #e4e6eb', borderBottom: '1px solid #e4e6eb', margin: '4px 16px 0' }}>
          <button
            type="button"
            aria-label="Curtir publicação"
            className="fb-post-like"
            onClick={handleLike}
            style={{
              flex: 1, padding: '8px 0', background: 'none', border: 'none', borderRadius: 6,
              color: liked ? resolvedColor : '#65676b', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? resolvedColor : 'none'} stroke={liked ? resolvedColor : '#65676b'} strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/>
              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            Curtir
          </button>
          <button
            type="button"
            aria-label="Comentar publicação"
            className="fb-post-action"
            style={{
              flex: 1, padding: '8px 0', background: 'none', border: 'none', borderRadius: 6,
              color: '#65676b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Comentar
          </button>
          <button
            type="button"
            aria-label="Compartilhar publicação"
            className="fb-post-action"
            style={{
              flex: 1, padding: '8px 0', background: 'none', border: 'none', borderRadius: 6,
              color: '#65676b', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            Compartilhar
          </button>
        </div>

        {/* Comment input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 12px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: resolvedColor,
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>V</span>
          </div>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              className="fb-post-input"
              type="text"
              placeholder="Escreva um comentário…"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              aria-label="Escrever comentário"
              style={{
                width: '100%',
                background: '#f0f2f5',
                border: 'none',
                borderRadius: 20,
                padding: '8px 14px',
                fontSize: 14,
                color: '#050505',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
