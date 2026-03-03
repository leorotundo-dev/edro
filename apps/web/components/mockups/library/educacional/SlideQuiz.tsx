'use client';

import React, { useState } from 'react';

interface SlideQuizProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const SlideQuiz: React.FC<SlideQuizProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const [selected, setSelected] = useState<number | null>(null);

  const resolvedTitle = title ?? headline ?? 'Quiz Rápido';
  const resolvedQuestion =
    body ?? text ?? description ??
    'Qual técnica de estudo baseia-se no intervalo crescente de revisão para consolidar a memória de longo prazo?';
  const resolvedInstitution = brandName ?? name ?? username ?? 'EduTech';
  const resolvedCaption = caption ?? 'Escolha a alternativa correta';

  const correctIndex = 2;
  const tiles = [
    { color: '#e53935', lightColor: '#ffebee', label: 'A', text: 'Técnica Pomodoro' },
    { color: '#1e88e5', lightColor: '#e3f2fd', label: 'B', text: 'Mapa Mental' },
    { color: '#43a047', lightColor: '#e8f5e9', label: 'C', text: 'Repetição Espaçada' },
    { color: '#fb8c00', lightColor: '#fff3e0', label: 'D', text: 'Leitura Linear' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        fontFamily: 'system-ui, sans-serif',
        background: '#1a1a2e',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px 10px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Kahoot-style lightning icon */}
          <div
            style={{
              width: '28px',
              height: '28px',
              background: '#f9c80e',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#1a1a2e" stroke="none">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff' }}>{resolvedTitle}</span>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedInstitution}
        </span>
      </div>

      {/* Question banner */}
      <div
        style={{
          background: 'rgba(255,255,255,0.07)',
          margin: '0 16px',
          borderRadius: '8px',
          padding: '10px 16px',
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedCaption}
        </div>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#ffffff', lineHeight: 1.45 }}>
          {resolvedQuestion}
        </p>
      </div>

      {/* 4-tile grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '10px 16px 14px',
        }}
      >
        {tiles.map((tile, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === correctIndex;
          const isWrong = isSelected && i !== correctIndex;

          return (
            <button
              key={i}
              type="button"
              aria-label={`Opção ${tile.label}: ${tile.text}`}
              onClick={() => setSelected(i)}
              style={{
                background: selected === null
                  ? tile.color
                  : isCorrect
                    ? tile.lightColor
                    : isWrong
                      ? '#fee2e2'
                      : 'rgba(255,255,255,0.08)',
                border: selected !== null && isSelected
                  ? `3px solid ${isWrong ? '#dc2626' : tile.color}`
                  : selected !== null && isCorrect
                    ? `3px solid ${tile.color}`
                    : '3px solid transparent',
                borderRadius: '10px',
                padding: '0 14px',
                cursor: selected === null ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all 0.15s',
                fontFamily: 'system-ui, sans-serif',
                boxShadow: isSelected ? `0 0 0 3px ${tile.color}40` : 'none',
              }}
            >
              {/* Label badge */}
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: selected !== null
                    ? isCorrect ? tile.color : isWrong ? '#dc2626' : 'rgba(255,255,255,0.15)'
                    : 'rgba(0,0,0,0.25)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {tile.label}
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: selected === null
                    ? '#ffffff'
                    : isCorrect
                      ? tile.color
                      : isWrong
                        ? '#dc2626'
                        : 'rgba(255,255,255,0.3)',
                  textAlign: 'left',
                  lineHeight: 1.3,
                }}
              >
                {tile.text}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slide number */}
      <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
        04
      </div>
    </div>
  );
};
