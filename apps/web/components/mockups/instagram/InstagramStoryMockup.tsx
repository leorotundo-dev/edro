import React from 'react';
import { renderHeadlineAccented } from '../../../lib/renderHeadlineAccented';

interface InstagramStoryMockupProps {
  username?: string;
  name?: string;
  profileImage?: string;
  storyImage?: string;
  image?: string;
  timeAgo?: string;
  /** AI-generated headline shown when no image */
  arteHeadline?: string;
  headline?: string;
  /** AI-generated body text */
  arteBody?: string;
  body?: string;
  /** Background/accent color for text overlay */
  arteBgColor?: string;
  /** Short teaser text above headline (Art Director) */
  eyebrow?: string;
  /** Word or phrase in headline to highlight with accentColor */
  accentWord?: string;
  /** Color for the accent word highlight */
  accentColor?: string;
  /** Number of story segments to show in progress bar */
  totalSegments?: number;
  /** Current active segment (0-based) */
  activeSegment?: number;
}


export const InstagramStoryMockup: React.FC<InstagramStoryMockupProps> = ({
  username = 'username',
  name,
  profileImage = '',
  storyImage = '',
  image,
  timeAgo = '2h',
  arteHeadline,
  headline,
  arteBody,
  body,
  arteBgColor,
  eyebrow,
  accentWord,
  accentColor,
  totalSegments = 3,
  activeSegment = 0,
}) => {
  const displayUsername = name || username;
  const resolvedImage = storyImage || image || '';
  const resolvedHeadline = arteHeadline || headline;
  const resolvedBody = arteBody || body;
  const resolvedAccentColor = accentColor || arteBgColor || '#E1306C';

  const segments = Math.max(1, totalSegments);

  return (
    <div
      className="font-sans text-white"
      style={{
        position: 'relative',
        width: 320,
        height: 568,
        borderRadius: 16,
        overflow: 'hidden',
        background: '#111',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* ── Background ── */}
      {resolvedImage ? (
        <>
          <img
            src={resolvedImage}
            alt="Story"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {(resolvedHeadline || resolvedBody || eyebrow) && (
            <div style={{
              position: 'absolute', bottom: 80, left: 0, right: 0, zIndex: 5,
              background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 65%, transparent 100%)',
              padding: '48px 24px 24px',
              textAlign: 'center',
            }}>
              {eyebrow && (
                <p style={{
                  color: 'rgba(255,255,255,0.70)', fontWeight: 600, fontSize: 10,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  margin: '0 0 8px', textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}>
                  {eyebrow}
                </p>
              )}
              {resolvedHeadline && (
                <p style={{
                  color: '#fff', fontWeight: 800, fontSize: 20, lineHeight: 1.25,
                  letterSpacing: '-0.02em', margin: '0 0 8px',
                  textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                }}>
                  {renderHeadlineAccented(resolvedHeadline, accentWord, accentColor)}
                </p>
              )}
              {resolvedBody && (
                <p style={{
                  color: 'rgba(255,255,255,0.85)', fontSize: 13, lineHeight: 1.45, margin: 0,
                  textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                }}>
                  {resolvedBody}
                </p>
              )}
            </div>
          )}
        </>
      ) : resolvedHeadline ? (
        /* AI text overlay as background */
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(160deg, #0f172a 0%, ${resolvedAccentColor}55 100%)`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '80px 28px 100px',
          textAlign: 'center',
        }}>
          {eyebrow && (
            <p style={{
              color: 'rgba(255,255,255,0.65)', fontWeight: 600, fontSize: 10,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              margin: '0 0 14px',
            }}>
              {eyebrow}
            </p>
          )}
          {/* Accent bar */}
          <div style={{
            width: 40, height: 3, borderRadius: 2,
            background: resolvedAccentColor,
            marginBottom: 18, opacity: 0.9,
          }} />
          <p style={{
            fontSize: 24, fontWeight: 800,
            lineHeight: 1.25, letterSpacing: '-0.02em',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            margin: '0 0 12px',
          }}>
            {renderHeadlineAccented(resolvedHeadline || '', accentWord, accentColor)}
          </p>
          {resolvedBody && (
            <p style={{
              fontSize: 14, lineHeight: 1.5,
              color: 'rgba(255,255,255,0.78)',
              margin: 0,
            }}>
              {resolvedBody}
            </p>
          )}
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Mídia Vertical 9:16</span>
        </div>
      )}

      {/* ── Top gradient for readability ── */}
      <div style={{
        position: 'absolute', top: 0, width: '100%', height: 100,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />

      {/* ── Top bar ── */}
      <div style={{ position: 'absolute', top: 0, width: '100%', zIndex: 20, padding: '10px 12px 0' }}>
        {/* Progress segments */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 2, borderRadius: 2,
                background: i <= activeSegment ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>

        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Avatar with gradient ring */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', padding: 2,
              background: 'linear-gradient(45deg, #f9ce34, #ee2a7b, #6228d7)',
              flexShrink: 0,
            }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid #111', overflow: 'hidden' }}>
                {profileImage ? (
                  <img src={profileImage} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: resolvedAccentColor }} />
                )}
              </div>
            </div>
            <span style={{ fontWeight: 600, fontSize: 13, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{displayUsername}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{timeAgo}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="6" cy="12" r="1.5" />
              <circle cx="18" cy="12" r="1.5" />
            </svg>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Bottom gradient ── */}
      <div style={{
        position: 'absolute', bottom: 0, width: '100%', height: 100,
        background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
        pointerEvents: 'none',
        zIndex: 10,
      }} />

      {/* ── Bottom bar: reply input + heart ── */}
      <div style={{
        position: 'absolute', bottom: 0, width: '100%',
        zIndex: 20, padding: '0 12px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          flex: 1, height: 44, borderRadius: 22,
          border: '1.5px solid rgba(255,255,255,0.55)',
          display: 'flex', alignItems: 'center', padding: '0 16px',
          background: 'rgba(0,0,0,0.12)',
          backdropFilter: 'blur(4px)',
        }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)' }}>Enviar mensagem</span>
        </div>
        {/* Heart */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z" />
        </svg>
        {/* Share */}
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </div>
    </div>
  );
};
