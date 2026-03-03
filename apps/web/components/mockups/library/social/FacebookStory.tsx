'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface FacebookStoryProps {
  /* Studio aliases */
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  /* Feature props */
  storyCount?: number;
  timeLabel?: string;
}

const FB_BLUE = '#1877F2';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export const FacebookStory: React.FC<FacebookStoryProps> = ({
  name,
  username,
  brandName,
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
  storyCount = 3,
  timeLabel = '2 h',
}) => {
  const [currentStory, setCurrentStory] = useState(0);

  const displayName = name || brandName || username || 'Nome do Usuário';
  const displayAvatar = profileImage || '';
  const displayMedia = image || postImage || thumbnail || '';
  const displayCaption = caption || body || text || description || headline || title || '';
  const totalSegments = Math.max(1, Math.min(storyCount, 5));

  const STORY_W = 240;
  const STORY_H = 427;

  return (
    <div
      style={{
        width: STORY_W,
        height: STORY_H,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: FONT,
        color: '#fff',
        userSelect: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
        background: '#18191A',
        flexShrink: 0,
      }}
    >
      {/* Full-screen background */}
      {displayMedia ? (
        <img
          src={displayMedia}
          alt="Story"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      ) : (
        /* Gradient placeholder */
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(160deg, #1877F2 0%, #7b2ff7 40%, #f7510f 80%, #f7c948 100%)',
          }}
        />
      )}

      {/* Top dark gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 130,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Bottom dark gradient overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 110,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Progress bars */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          gap: 3,
          zIndex: 3,
        }}
      >
        {Array.from({ length: totalSegments }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 2.5,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: i < currentStory ? '100%' : i === currentStory ? '60%' : '0%',
                background: i === currentStory ? '#fff' : 'rgba(255,255,255,0.85)',
                borderRadius: 2,
                transition: i === currentStory ? 'width 5s linear' : 'none',
              }}
            />
          </div>
        ))}
      </div>

      {/* Header: avatar + name + time + controls */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 3,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Avatar with story ring (blue/purple gradient) */}
          <div
            style={{
              padding: 2,
              borderRadius: '50%',
              background:
                'linear-gradient(45deg, #1877F2 0%, #7b2ff7 60%, #f7510f 100%)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '2px solid #18191A',
                overflow: 'hidden',
                background: '#444',
              }}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(135deg, #8b9cb3 0%, #b0bec5 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.8)" aria-hidden="true">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Name + time */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 13,
                color: '#fff',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.8)',
                marginTop: 2,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              {timeLabel}
            </span>
          </div>
        </div>

        {/* Controls: more + close */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            type="button"
            aria-label="Mais opções"
            title="Mais opções"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Fechar story"
            title="Fechar story"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tap areas: prev / next */}
      <button
        type="button"
        aria-label="Story anterior"
        title="Story anterior"
        onClick={() => setCurrentStory((p) => Math.max(0, p - 1))}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '45%',
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          zIndex: 2,
        }}
      />
      <button
        type="button"
        aria-label="Próximo story"
        title="Próximo story"
        onClick={() => setCurrentStory((p) => Math.min(totalSegments - 1, p + 1))}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '55%',
          height: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          zIndex: 2,
        }}
      />

      {/* Caption overlay (center) */}
      {displayCaption && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: 16,
            right: 16,
            transform: 'translateY(-50%)',
            zIndex: 3,
            pointerEvents: 'none',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 18,
              fontWeight: 700,
              lineHeight: '26px',
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.5)',
              margin: 0,
            }}
          >
            {displayCaption}
          </p>
        </div>
      )}

      {/* Bottom: reply input + send */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 10,
          right: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 3,
        }}
      >
        {/* Reply input */}
        <div
          style={{
            flex: 1,
            height: 38,
            borderRadius: 24,
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 14,
            paddingRight: 10,
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.85)',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            }}
          >
            Responder a {displayName}...
          </span>
        </div>

        {/* Send / like button */}
        <button
          type="button"
          aria-label="Enviar reação"
          title="Enviar reação"
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(4px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22l-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
};
