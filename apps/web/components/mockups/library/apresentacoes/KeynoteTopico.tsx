'use client';

import React from 'react';

interface KeynoteTopicoProps {
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
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteTopico: React.FC<KeynoteTopicoProps> = ({
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor,
  themeColor,
}) => {
  const accent = brandColor ?? themeColor ?? '#6366F1';
  const resolvedTitle = title ?? headline ?? brandName ?? 'Tópico 02';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Uma visão aprofundada sobre os mecanismos que transformam dados em decisões estratégicas de alto impacto.';
  const topicNumber = '02';

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        display: 'flex',
      }}
    >
      {/* Left accent half — full bleed color */}
      <div
        style={{
          width: '48%',
          background: `linear-gradient(160deg, ${accent} 0%, ${accent}cc 100%)`,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '28px 24px',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-40px',
            left: '-40px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        {/* Topic number */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.2)',
            lineHeight: 1,
            position: 'absolute',
            bottom: '10px',
            right: '16px',
            letterSpacing: '-4px',
          }}
        >
          {topicNumber}
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            padding: '6px 14px',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          Tópico {topicNumber}
        </div>

        <div
          style={{
            fontSize: '52px',
            fontWeight: 900,
            color: '#fff',
            lineHeight: 1,
            letterSpacing: '-2px',
          }}
        >
          {topicNumber}
        </div>
      </div>

      {/* Right content half */}
      <div
        style={{
          flex: 1,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '32px 28px',
          position: 'relative',
        }}
      >
        {/* Accent line */}
        <div
          style={{
            width: '4px',
            height: '48px',
            background: accent,
            borderRadius: '2px',
            marginBottom: '16px',
          }}
        />

        <div
          style={{
            fontSize: '9px',
            fontWeight: 700,
            color: accent,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          Próximo tópico
        </div>

        <h2
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#1a1a2e',
            margin: '0 0 14px 0',
            lineHeight: 1.15,
          }}
        >
          {resolvedTitle}
        </h2>

        <p
          style={{
            fontSize: '11px',
            color: '#666',
            lineHeight: 1.6,
            margin: '0 0 20px 0',
          }}
        >
          {resolvedBody}
        </p>

        {/* Sub-items */}
        {['Fundamentos', 'Aplicações práticas', 'Casos de uso'].map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px',
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: accent,
                opacity: 1 - i * 0.25,
              }}
            />
            <span style={{ fontSize: '10px', color: '#555', fontWeight: 500 }}>{item}</span>
          </div>
        ))}

        {/* Slide number */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            right: '18px',
            fontSize: '10px',
            color: '#ccc',
            fontWeight: 600,
          }}
        >
          05
        </div>
      </div>
    </div>
  );
};
