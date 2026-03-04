'use client';

import React, { useState, useEffect } from 'react';

interface FacebookStoryProps {
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

export const FacebookStory: React.FC<FacebookStoryProps> = ({
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
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [replied, setReplied] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [viewers, setViewers] = useState(1247);

  const resolvedUser = username ?? name ?? brandName ?? headline ?? title ?? 'amigo.da.silva';
  const resolvedCaption = caption ?? body ?? description ?? text ?? '';
  const resolvedMedia = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  // Animate progress bar
  useEffect(() => {
    if (paused) return;
    if (progress >= 100) return;
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 0.5, 100));
    }, 30);
    return () => clearInterval(timer);
  }, [paused, progress]);

  return (
    <div style={{
      width: 320,
      height: 568,
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      background: '#18191a',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      color: '#fff',
      userSelect: 'none',
    }}>
      <style>{`
        @keyframes fb-story-prog { from { width: 0%; } to { width: 100%; } }
        @keyframes fb-story-in { from { opacity:0; transform:scale(1.04); } to { opacity:1; transform:scale(1); } }
        .fb-story-media { animation: fb-story-in 0.4s ease; }
        .fb-story-reply-input:focus { outline: none; }
        .fb-story-react-btn:hover { transform: scale(1.2); }
        .fb-story-react-btn { transition: transform 0.15s; }
      `}</style>

      {/* Background media */}
      {resolvedMedia ? (
        <img
          src={resolvedMedia}
          alt="Story"
          className="fb-story-media"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div
          className="fb-story-media"
          style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(160deg, ${resolvedColor}cc 0%, #7c3aed 60%, #db2777 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {resolvedCaption ? (
            <div style={{
              textAlign: 'center', padding: '0 28px',
              fontSize: 22, fontWeight: 800, lineHeight: 1.35,
              textShadow: '0 2px 12px rgba(0,0,0,0.4)',
            }}>
              {resolvedCaption}
            </div>
          ) : (
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>
      )}

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 120,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 140,
        background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Progress bars — 3 segments */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 20, display: 'flex', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: '#fff',
              width: i === 0 ? `${progress}%` : i < 0 ? '100%' : '0%',
              transition: 'width 0.05s linear',
            }} />
          </div>
        ))}
      </div>

      {/* Header row */}
      <div style={{ position: 'absolute', top: 22, left: 12, right: 12, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar with gradient ring */}
          <div style={{
            padding: 2, borderRadius: '50%',
            background: `linear-gradient(135deg, ${resolvedColor}, #db2777)`,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: '2px solid #18191a',
              background: resolvedAvatar ? 'transparent' : resolvedColor,
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {resolvedAvatar
                ? <img src={resolvedAvatar} alt={resolvedUser} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{resolvedUser.charAt(0).toUpperCase()}</span>
              }
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{resolvedUser}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)"><circle cx="12" cy="12" r="10"/></svg>
              há 2h
              <span style={{ marginLeft: 6, display: 'flex', alignItems: 'center', gap: 2 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {viewers.toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            aria-label={paused ? 'Retomar story' : 'Pausar story'}
            onClick={() => setPaused((p) => !p)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            {paused
              ? <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            }
          </button>
          <button type="button" aria-label="Fechar story" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Caption overlay (if has media) */}
      {resolvedMedia && resolvedCaption && (
        <div style={{
          position: 'absolute', bottom: 80, left: 0, right: 0, zIndex: 15,
          padding: '8px 20px',
          background: 'rgba(0,0,0,0.35)',
          textAlign: 'center',
          fontSize: 16, fontWeight: 700, lineHeight: 1.35,
          textShadow: '0 1px 6px rgba(0,0,0,0.6)',
        }}>
          {resolvedCaption}
        </div>
      )}

      {/* Reaction row */}
      <div style={{ position: 'absolute', bottom: 56, left: 12, right: 12, zIndex: 20, display: 'flex', justifyContent: 'center', gap: 16 }}>
        {['❤️', '😂', '😮', '😢', '👍'].map((emoji, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Reagir com ${emoji}`}
            className="fb-story-react-btn"
            onClick={() => setViewers((v) => v + 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 2 }}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Reply input */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, zIndex: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="fb-story-reply-input"
          type="text"
          placeholder="Enviar mensagem…"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          aria-label="Responder ao story"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 20, padding: '7px 14px',
            fontSize: 13, color: '#fff',
          }}
        />
        <button
          type="button"
          aria-label="Enviar resposta"
          onClick={() => { if (replyText.trim()) { setReplied(true); setReplyText(''); } }}
          style={{
            background: replied ? 'rgba(255,255,255,0.3)' : resolvedColor,
            border: 'none', borderRadius: '50%', width: 36, height: 36,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  );
};
