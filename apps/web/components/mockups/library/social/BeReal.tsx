'use client';
import React, { useState } from 'react';

interface BeRealProps {
  username?: string;
  name?: string;
  brandName?: string;
  frontImage?: string;
  backImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  caption?: string;
  body?: string;
  description?: string;
  text?: string;
  headline?: string;
  timeLabel?: string;
  location?: string;
  lateBy?: string;
  reactionCount?: number;
  commentCount?: number;
  isLate?: boolean;
}

export const BeReal: React.FC<BeRealProps> = ({
  username,
  name,
  brandName,
  frontImage,
  backImage,
  image,
  postImage,
  thumbnail,
  profileImage,
  caption,
  body,
  description,
  text,
  headline,
  timeLabel = 'Agora',
  location,
  lateBy = '2h 14min',
  reactionCount = 12,
  commentCount = 3,
  isLate = true,
}) => {
  const [reacted, setReacted] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const displayName = username || name || brandName || 'usuario';
  const handle = displayName.startsWith('@') ? displayName : displayName;
  const displayAvatar = profileImage || image || '';
  const displayBack = backImage || postImage || thumbnail || '';
  const displayFront = frontImage || '';
  const displayCaption = caption || body || description || text || headline || '';

  const REACTIONS = ['😂', '🔥', '😍', '👀', '💀', '🤩'];

  return (
    <div style={{
      width: 340,
      background: '#000',
      borderRadius: 20,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Arial, sans-serif',
      color: '#fff',
      boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
      flexShrink: 0,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
      }}>
        {/* Avatar + user info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            overflow: 'hidden', background: '#222', flexShrink: 0,
            border: '2px solid #fff',
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #333 0%, #555 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#fff',
                }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em' }}>{handle}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>
              {timeLabel}
              {location && ` · ${location}`}
            </div>
          </div>
        </div>

        {/* Late badge */}
        {isLate && (
          <div style={{
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: 11.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)',
          }}>
            {lateBy} atrasado
          </div>
        )}
      </div>

      {/* Dual-camera photo area */}
      <div style={{ position: 'relative', margin: '0 12px', borderRadius: 14, overflow: 'hidden' }}>
        {/* Main (back camera) */}
        <div style={{
          width: '100%',
          paddingTop: '133%', /* 3:4 */
          position: 'relative',
          background: '#1a1a1a',
          overflow: 'hidden',
          borderRadius: 14,
        }}>
          {displayBack
            ? <img src={displayBack} alt="Câmera traseira" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            : (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(160deg, #111 0%, #2a2a2a 100%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, opacity: 0.7,
              }}>
                {/* Camera icon */}
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Câmera traseira</span>
              </div>
            )
          }
        </div>

        {/* Front camera (selfie overlay — top-left) */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          width: 90, height: 120,
          borderRadius: 10,
          overflow: 'hidden',
          border: '2.5px solid #000',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          background: '#222',
        }}>
          {displayFront
            ? <img src={displayFront} alt="Câmera frontal" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (
              <div style={{
                width: '100%', height: '100%',
                background: 'linear-gradient(160deg, #2a2a2a 0%, #111 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Person icon */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.3)">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )
          }
        </div>

        {/* "BeReal." watermark */}
        <div style={{
          position: 'absolute', bottom: 12, left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          borderRadius: 20, padding: '4px 12px',
        }}>
          <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.02em', color: '#fff' }}>BeReal.</span>
        </div>
      </div>

      {/* Caption */}
      {displayCaption && (
        <div style={{ padding: '10px 16px 4px', fontSize: 14, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
          {displayCaption}
        </div>
      )}

      {/* Reactions row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Emoji reaction button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              aria-label="Reagir"
              onClick={() => setShowReactions(p => !p)}
              style={{
                background: reacted ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
                border: reacted ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20, padding: '5px 10px',
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', color: '#fff',
              }}
            >
              <span style={{ fontSize: 16 }}>😊</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{reactionCount + (reacted ? 1 : 0)}</span>
            </button>

            {showReactions && (
              <div style={{
                position: 'absolute', bottom: 40, left: 0,
                background: '#1a1a1a', borderRadius: 30,
                padding: '8px 12px',
                display: 'flex', gap: 8,
                boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 20,
              }}>
                {REACTIONS.map(e => (
                  <button
                    key={e}
                    type="button"
                    aria-label={`Reagir com ${e}`}
                    onClick={() => { setReacted(true); setShowReactions(false); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, padding: 2 }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comment count */}
          <button type="button" aria-label="Comentários" style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 20, padding: '5px 10px',
            display: 'flex', alignItems: 'center', gap: 5,
            cursor: 'pointer', color: '#fff',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{commentCount}</span>
          </button>
        </div>

        {/* Share */}
        <button type="button" aria-label="Compartilhar" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(255,255,255,0.5)', padding: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </div>
    </div>
  );
};
