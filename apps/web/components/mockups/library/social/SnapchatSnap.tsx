'use client';
import React, { useState } from 'react';

interface SnapchatSnapProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  snapImage?: string;
  postImage?: string;
  thumbnail?: string;
  caption?: string;
  description?: string;
  body?: string;
  text?: string;
  timeLabel?: string;
  duration?: number;
}

// Snapchat Ghost logo
const SnapGhost = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" fill="white">
    <path d="M64 8C39.1 8 19 28.1 19 53c0 14.2 6.5 26.8 16.7 35.2-1.4 3.3-3.5 5.8-6.4 7.3-2.6 1.4-4.5 1.7-4.5 3.3 0 1.8 2.2 2.6 4.9 3.3 3.5.9 7.2 1.3 10.9 1.3 2 0 4.2-.2 6.3-.5 1.8 2.9 7.3 9.1 17.1 9.1 9.8 0 15.3-6.2 17.1-9.1 2.1.3 4.3.5 6.3.5 3.7 0 7.4-.4 10.9-1.3 2.7-.7 4.9-1.5 4.9-3.3 0-1.6-1.9-1.9-4.5-3.3-2.9-1.5-5-4-6.4-7.3C102.5 79.8 109 67.2 109 53 109 28.1 88.9 8 64 8z" />
  </svg>
);

export const SnapchatSnap: React.FC<SnapchatSnapProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  snapImage,
  postImage,
  thumbnail,
  caption,
  description,
  body,
  text,
  timeLabel = 'Agora',
  duration = 10,
}) => {
  const [viewed] = useState(false);

  const displayName = name || username || brandName || 'snapuser';
  const displayAvatar = profileImage || image || '';
  const displayMedia = snapImage || postImage || thumbnail || '';
  const displayCaption = caption || description || body || text || '';
  const segments = Math.min(Math.max(duration, 1), 10);

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
        ? <img src={displayMedia} alt="Snap" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(160deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
          }} />
        )
      }

      {/* Top gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 140,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 180,
        background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* Progress segments */}
      <div style={{
        position: 'absolute', top: 14, left: 12, right: 12,
        display: 'flex', gap: 3, zIndex: 10,
      }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              background: i === 0 && !viewed
                ? 'rgba(255,255,255,0.95)'
                : 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
            }}
          >
            {i === 0 && !viewed && (
              <div style={{
                width: '60%',
                height: '100%',
                background: '#FFFC00',
                borderRadius: 2,
              }} />
            )}
          </div>
        ))}
      </div>

      {/* Top bar: avatar + name + time | ghost + X */}
      <div style={{
        position: 'absolute', top: 26, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar with yellow ring */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '2.5px solid #FFFC00',
            overflow: 'hidden',
            background: '#333',
            flexShrink: 0,
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Ghost watermark */}
          <div style={{ opacity: 0.85 }}>
            <SnapGhost size={26} />
          </div>
          {/* Close */}
          <button type="button" aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Caption bubble */}
      {displayCaption && (
        <div style={{
          position: 'absolute',
          bottom: 90,
          left: 24,
          right: 24,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'center',
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            borderRadius: 12,
            padding: '8px 16px',
            maxWidth: '100%',
          }}>
            <p style={{
              fontSize: 15,
              fontWeight: 600,
              textAlign: 'center',
              textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              lineHeight: 1.45,
              margin: 0,
            }}>
              {displayCaption}
            </p>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div style={{
        position: 'absolute', bottom: 20, left: 12, right: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 10,
      }}>
        {/* Reply area */}
        <div style={{
          flex: 1,
          height: 40,
          border: '1.5px solid rgba(255,255,255,0.6)',
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 14,
          marginRight: 10,
        }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>Responder...</span>
        </div>
        {/* Reaction emoji */}
        <button type="button" aria-label="Reagir" style={{
          background: 'rgba(255,255,255,0.15)',
          border: 'none',
          borderRadius: '50%',
          width: 40, height: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 18,
        }}>
          😮
        </button>
      </div>
    </div>
  );
};
