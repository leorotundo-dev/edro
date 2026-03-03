'use client';

import React, { useState } from 'react';

interface BannerCountdownProps {
  title?: string;
  headline?: string;
  name?: string;
  brandName?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  discount?: string;
}

export const BannerCountdown: React.FC<BannerCountdownProps> = ({
  title: titleProp,
  headline,
  name,
  brandName,
  subtitle,
  description,
  body,
  caption,
  image: imageProp,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#5D87FF',
  discount = '50%',
}) => {
  const title = titleProp ?? headline ?? 'Oferta por tempo limitado';
  const sub = subtitle ?? description ?? body ?? caption ?? 'Aproveite antes que acabe!';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  // Static fake countdown values (no live timer to keep it stable for preview)
  const [hours] = useState('23');
  const [minutes] = useState('59');
  const [seconds] = useState('47');

  const bgDark = '#0F0F14';
  const bgCard = '#1A1A24';

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        width: '600px',
        height: '200px',
        borderRadius: '12px',
        overflow: 'hidden',
        background: bgDark,
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'stretch',
        fontFamily: "'Segoe UI', Arial, sans-serif",
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Subtle top gradient accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${brandColor}, #FF6B00, transparent)`,
        }}
      />

      {/* Left section — label + headline */}
      <div
        style={{
          flex: '0 0 220px',
          padding: '22px 20px 22px 24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '8px',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255,107,0,0.12)',
            border: '1px solid rgba(255,107,0,0.3)',
            borderRadius: '4px',
            padding: '3px 9px',
            alignSelf: 'flex-start',
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#FF6B00',
              animation: 'none',
            }}
          />
          <span
            style={{
              color: '#FF6B00',
              fontSize: '10px',
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            Oferta Relampago
          </span>
        </div>

        <h2
          style={{
            color: '#ffffff',
            fontSize: '17px',
            fontWeight: 800,
            lineHeight: 1.25,
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '12px',
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          {sub}
        </p>
      </div>

      {/* Center section — countdown */}
      <div
        style={{
          flex: '0 0 220px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '20px',
        }}
      >
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '10px',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Termina em
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[
            { value: hours, label: 'HORAS' },
            { value: minutes, label: 'MIN' },
            { value: seconds, label: 'SEG' },
          ].map((unit, i) => (
            <React.Fragment key={unit.label}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <div
                  style={{
                    background: bgCard,
                    border: `1px solid ${brandColor}30`,
                    borderRadius: '8px',
                    width: '50px',
                    height: '50px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: `0 0 12px ${brandColor}20, inset 0 1px 0 rgba(255,255,255,0.06)`,
                  }}
                >
                  <span
                    style={{
                      color: '#ffffff',
                      fontSize: '22px',
                      fontWeight: 900,
                      letterSpacing: '-0.5px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {unit.value}
                  </span>
                </div>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '9px',
                    letterSpacing: '1px',
                    fontWeight: 700,
                  }}
                >
                  {unit.label}
                </span>
              </div>
              {i < 2 && (
                <span
                  style={{
                    color: brandColor,
                    fontSize: '22px',
                    fontWeight: 900,
                    marginBottom: '14px',
                    lineHeight: 1,
                  }}
                >
                  :
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Right section — discount badge + CTA */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '20px 24px 20px 16px',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
        }}
      >
        {/* Product thumbnail */}
        {image && (
          <img
            src={image}
            alt="produto"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.12,
            }}
          />
        )}

        {/* Discount badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1,
          }}
        >
          <span
            style={{
              color: brandColor,
              fontSize: '42px',
              fontWeight: 900,
              letterSpacing: '-2px',
            }}
          >
            {discount}
          </span>
          <span
            style={{
              color: brandColor,
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '2px',
              marginTop: '-4px',
            }}
          >
            OFF
          </span>
        </div>

        {/* CTA */}
        <button
          type="button"
          style={{
            background: brandColor,
            color: '#ffffff',
            border: 'none',
            borderRadius: '7px',
            padding: '9px 18px',
            fontSize: '12px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            boxShadow: `0 4px 14px ${brandColor}50`,
            whiteSpace: 'nowrap',
          }}
        >
          Aproveitar Agora
        </button>
      </div>
    </div>
  );
};
