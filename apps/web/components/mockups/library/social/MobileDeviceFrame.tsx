'use client';
import React from 'react';

type FrameColor = 'black' | 'white' | 'natural' | 'blue';

interface MobileDeviceFrameProps {
  /** Content image shown on screen */
  image?: string;
  postImage?: string;
  thumbnail?: string;
  /** Frame color / finish */
  color?: FrameColor;
  /** Optional label inside screen (when no image) */
  headline?: string;
  name?: string;
  title?: string;
}

const FRAME_COLORS: Record<FrameColor, { frame: string; button: string; screen: string }> = {
  black: {
    frame: 'linear-gradient(145deg, #2a2a2a 0%, #1a1a1a 40%, #222 60%, #2c2c2c 100%)',
    button: '#1a1a1a',
    screen: '#0a0a0a',
  },
  white: {
    frame: 'linear-gradient(145deg, #f0f0f0 0%, #e0e0e0 40%, #e8e8e8 60%, #f2f2f2 100%)',
    button: '#d0d0d0',
    screen: '#0a0a0a',
  },
  natural: {
    frame: 'linear-gradient(145deg, #8a7f6e 0%, #7a7060 40%, #857b6a 60%, #8c8270 100%)',
    button: '#6e6456',
    screen: '#0a0a0a',
  },
  blue: {
    frame: 'linear-gradient(145deg, #4a6fa0 0%, #3a5a88 40%, #405e90 60%, #4a6aa0 100%)',
    button: '#3a5080',
    screen: '#0a0a0a',
  },
};

// Outer dimensions
const W = 300;   // frame width
const H = 618;   // frame height
const R = 46;    // outer corner radius
const BORDER = 13; // frame thickness
const SCREEN_W = W - BORDER * 2;
const SCREEN_H = H - BORDER * 2;
const SCREEN_R = R - BORDER;

export const MobileDeviceFrame: React.FC<MobileDeviceFrameProps> = ({
  image,
  postImage,
  thumbnail,
  color = 'black',
  headline,
  name,
  title,
}) => {
  const displayImage = image || postImage || thumbnail || '';
  const displayLabel = headline || name || title || '';
  const theme = FRAME_COLORS[color];

  return (
    <div style={{
      position: 'relative',
      width: W,
      height: H,
      flexShrink: 0,
    }}>
      {/* Outer frame */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: R,
        background: theme.frame,
        boxShadow: [
          '0 30px 80px rgba(0,0,0,0.55)',
          '0 6px 24px rgba(0,0,0,0.3)',
          'inset 0 1px 0 rgba(255,255,255,0.12)',
          'inset 0 -1px 0 rgba(0,0,0,0.2)',
        ].join(', '),
      }} />

      {/* Volume up button — left side */}
      <div style={{
        position: 'absolute',
        left: -3,
        top: 140,
        width: 4,
        height: 36,
        borderRadius: '3px 0 0 3px',
        background: theme.button,
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Volume down button — left side */}
      <div style={{
        position: 'absolute',
        left: -3,
        top: 188,
        width: 4,
        height: 36,
        borderRadius: '3px 0 0 3px',
        background: theme.button,
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Silent switch — left side */}
      <div style={{
        position: 'absolute',
        left: -3,
        top: 100,
        width: 4,
        height: 22,
        borderRadius: '3px 0 0 3px',
        background: theme.button,
        boxShadow: '-1px 0 2px rgba(0,0,0,0.4)',
      }} />
      {/* Power button — right side */}
      <div style={{
        position: 'absolute',
        right: -3,
        top: 155,
        width: 4,
        height: 60,
        borderRadius: '0 3px 3px 0',
        background: theme.button,
        boxShadow: '1px 0 2px rgba(0,0,0,0.4)',
      }} />

      {/* Screen bezel */}
      <div style={{
        position: 'absolute',
        top: BORDER,
        left: BORDER,
        width: SCREEN_W,
        height: SCREEN_H,
        borderRadius: SCREEN_R,
        overflow: 'hidden',
        background: theme.screen,
      }}>
        {/* Screen content */}
        {displayImage
          ? (
            <img
              src={displayImage}
              alt="Screen content"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          )
          : (
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 50%, #16213e 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif',
            }}>
              {/* App icon placeholder */}
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              {displayLabel && (
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}>
                  {displayLabel}
                </p>
              )}
            </div>
          )
        }

        {/* Status bar overlay */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 52,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Dynamic Island */}
        <div style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 120,
          height: 34,
          borderRadius: 20,
          background: '#000',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 10,
        }} />

        {/* Status bar: time + icons */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 20,
          right: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 11,
          pointerEvents: 'none',
        }}>
          <span style={{ color: 'white', fontSize: 15, fontWeight: 600, fontFamily: '-apple-system, sans-serif', letterSpacing: '-0.02em' }}>
            9:41
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Signal */}
            <svg width="16" height="12" viewBox="0 0 16 12" fill="white">
              <rect x="0" y="7" width="3" height="5" rx="0.5" />
              <rect x="4.5" y="5" width="3" height="7" rx="0.5" />
              <rect x="9" y="3" width="3" height="9" rx="0.5" />
              <rect x="13.5" y="0" width="2.5" height="12" rx="0.5" opacity="0.4" />
            </svg>
            {/* WiFi */}
            <svg width="16" height="12" viewBox="0 0 24 18" fill="white">
              <path d="M1 5.5C5 1.5 11 0 12 0s7 1.5 11 5.5l-3 3C17 6 15 5 12 5s-5 1-8 3.5l-3-3z" opacity="0.4" />
              <path d="M5 9.5C7.5 7 9.5 6 12 6s4.5 1 7 3.5l-3 3C14.5 11 13 10.5 12 10.5s-2.5.5-4 2l-3-3z" opacity="0.7" />
              <path d="M9 13.5C10 12.5 11 12 12 12s2 .5 3 1.5l-3 3-3-3z" />
            </svg>
            {/* Battery */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <div style={{ width: 25, height: 12, border: '1.5px solid white', borderRadius: 3, padding: 2, display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '80%', height: '100%', background: 'white', borderRadius: 1.5 }} />
              </div>
              <div style={{ width: 2, height: 6, background: 'rgba(255,255,255,0.5)', borderRadius: '0 2px 2px 0', marginLeft: 1 }} />
            </div>
          </div>
        </div>

        {/* Home indicator */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 134,
          height: 5,
          borderRadius: 3,
          background: 'rgba(255,255,255,0.45)',
          zIndex: 10,
        }} />
      </div>

      {/* Frame edge highlight */}
      <div style={{
        position: 'absolute',
        inset: 0,
        borderRadius: R,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
        pointerEvents: 'none',
      }} />
    </div>
  );
};
