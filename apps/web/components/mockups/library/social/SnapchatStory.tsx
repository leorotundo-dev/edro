'use client';
import React, { useState } from 'react';

interface SnapchatStoryProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  storyImage?: string;
  postImage?: string;
  thumbnail?: string;
  caption?: string;
  description?: string;
  body?: string;
  text?: string;
  headline?: string;
  storyCount?: number;
  timeLabel?: string;
}

const SnapGhost = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="white">
    <path d="M64 8C39.1 8 19 28.1 19 53c0 14.2 6.5 26.8 16.7 35.2-1.4 3.3-3.5 5.8-6.4 7.3-2.6 1.4-4.5 1.7-4.5 3.3 0 1.8 2.2 2.6 4.9 3.3 3.5.9 7.2 1.3 10.9 1.3 2 0 4.2-.2 6.3-.5 1.8 2.9 7.3 9.1 17.1 9.1 9.8 0 15.3-6.2 17.1-9.1 2.1.3 4.3.5 6.3.5 3.7 0 7.4-.4 10.9-1.3 2.7-.7 4.9-1.5 4.9-3.3 0-1.6-1.9-1.9-4.5-3.3-2.9-1.5-5-4-6.4-7.3C102.5 79.8 109 67.2 109 53 109 28.1 88.9 8 64 8z" />
  </svg>
);

export const SnapchatStory: React.FC<SnapchatStoryProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  storyImage,
  postImage,
  thumbnail,
  caption,
  description,
  body,
  text,
  headline,
  storyCount = 5,
  timeLabel = 'Agora',
}) => {
  const [currentSnap, setCurrentSnap] = useState(0);
  const totalSnaps = Math.min(Math.max(storyCount, 1), 8);

  const displayName = name || username || brandName || 'snapuser';
  const displayAvatar = profileImage || image || '';
  const displayMedia = storyImage || postImage || thumbnail || '';
  const displayCaption = caption || description || body || text || headline || '';

  return (
    <div style={{
      position: 'relative',
      width: 320,
      height: 568,
      background: '#000',
      borderRadius: 18,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      color: '#fff',
      boxShadow: '0 10px 44px rgba(0,0,0,0.55)',
      flexShrink: 0,
    }}>
      {/* Background media */}
      {displayMedia
        ? <img src={displayMedia} alt="Story" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 50%, #16213e 100%)',
          }} />
        )
      }

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 150,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
        background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Progress segments */}
      <div style={{
        position: 'absolute', top: 14, left: 12, right: 12,
        display: 'flex', gap: 3, zIndex: 10,
      }}>
        {Array.from({ length: totalSnaps }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Snap ${i + 1}`}
            onClick={() => setCurrentSnap(i)}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= currentSnap ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)',
              border: 'none', cursor: 'pointer', padding: 0,
              position: 'relative', overflow: 'hidden',
            }}
          >
            {i === currentSnap && (
              <div style={{
                position: 'absolute', inset: 0,
                background: '#FFFC00',
                borderRadius: 2,
                width: '55%',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* Snap counter */}
      <div style={{
        position: 'absolute', top: 10, right: 12,
        fontSize: 11, color: 'rgba(255,255,255,0.7)',
        zIndex: 11,
        fontWeight: 600,
      }}>
        {currentSnap + 1}/{totalSnaps}
      </div>

      {/* Header row */}
      <div style={{
        position: 'absolute', top: 26, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar with yellow ring */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2.5px solid #FFFC00',
            overflow: 'hidden', background: '#222', flexShrink: 0,
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FFFC00 0%, #FFD700 100%)' }} />
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>
              {timeLabel}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SnapGhost size={24} />
          <button type="button" aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tap zones (prev/next) */}
      <button
        type="button"
        aria-label="Snap anterior"
        onClick={() => setCurrentSnap(p => Math.max(0, p - 1))}
        style={{
          position: 'absolute', top: 80, left: 0, bottom: 90,
          width: '40%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 9,
        }}
      />
      <button
        type="button"
        aria-label="Próximo snap"
        onClick={() => setCurrentSnap(p => Math.min(totalSnaps - 1, p + 1))}
        style={{
          position: 'absolute', top: 80, right: 0, bottom: 90,
          width: '60%', background: 'transparent', border: 'none', cursor: 'pointer', zIndex: 9,
        }}
      />

      {/* Caption bubble */}
      {displayCaption && (
        <div style={{
          position: 'absolute', bottom: 90,
          left: 24, right: 24, zIndex: 10,
          display: 'flex', justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.52)',
            backdropFilter: 'blur(6px)',
            borderRadius: 12,
            padding: '8px 16px',
          }}>
            <p style={{ fontSize: 15, fontWeight: 600, textAlign: 'center', margin: 0, lineHeight: 1.45 }}>
              {displayCaption}
            </p>
          </div>
        </div>
      )}

      {/* Bottom: reply + share */}
      <div style={{
        position: 'absolute', bottom: 20, left: 12, right: 12,
        display: 'flex', alignItems: 'center', gap: 10, zIndex: 10,
      }}>
        <div style={{
          flex: 1, height: 42,
          border: '1.5px solid rgba(255,255,255,0.55)',
          borderRadius: 24,
          display: 'flex', alignItems: 'center', paddingLeft: 14,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Responder a {displayName}...</span>
        </div>
        <button type="button" aria-label="Compartilhar" style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none', borderRadius: '50%',
          width: 42, height: 42,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" stroke="white" />
          </svg>
        </button>
      </div>
    </div>
  );
};
