'use client';

import React from 'react';

interface LinhaDoTempoProps {
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

export const LinhaDoTempo: React.FC<LinhaDoTempoProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Linha do Tempo';
  const resolvedSubtitle = description ?? caption ?? body ?? text ?? 'Evolução das teorias de aprendizagem';
  const resolvedPublisher = brandName ?? name ?? username ?? 'EduHist';
  const accent = brandColor;

  const events = [
    { year: '1885', title: 'Curva do Esquecimento', desc: 'Hermann Ebbinghaus publica estudos sobre memória e esquecimento, base da repetição espaçada.' },
    { year: '1913', title: 'Behaviorismo', desc: 'John Watson propõe que o aprendizado é resultado de estímulo e resposta condicionados.' },
    { year: '1956', title: 'Taxonomia de Bloom', desc: 'Benjamin Bloom classifica objetivos educacionais em domínios cognitivos hierárquicos.' },
    { year: '1983', title: 'Inteligências Múltiplas', desc: 'Howard Gardner propõe que existem diferentes tipos de inteligência além do QI tradicional.' },
    { year: '2006', title: 'Aprendizagem Ativa', desc: 'Consolidação das metodologias ativas com foco em sala invertida e PBL.' },
    { year: '2024', title: 'IA na Educação', desc: 'Ferramentas de inteligência artificial personalizam trilhas de aprendizado em tempo real.' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '520px',
        minHeight: '480px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '20px 28px',
        }}
      >
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
          {resolvedPublisher}
        </div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#ffffff', marginBottom: '4px' }}>
          {resolvedTitle}
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
          {resolvedSubtitle}
        </p>
      </div>

      {/* Timeline body */}
      <div style={{ padding: '24px 28px 24px 20px', position: 'relative' }}>
        {/* Vertical line */}
        <div
          style={{
            position: 'absolute',
            left: '52px',
            top: '24px',
            bottom: '24px',
            width: '2px',
            background: `linear-gradient(to bottom, ${accent}, ${accent}30)`,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
          {events.map((ev, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0',
                marginBottom: i < events.length - 1 ? '18px' : '0',
              }}
            >
              {/* Year label */}
              <div
                style={{
                  minWidth: '44px',
                  fontSize: '10px',
                  fontWeight: 800,
                  color: accent,
                  textAlign: 'right',
                  paddingTop: '2px',
                  lineHeight: 1,
                }}
              >
                {ev.year}
              </div>

              {/* Dot */}
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  margin: '0 14px',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: '#ffffff',
                    border: `3px solid ${accent}`,
                    boxShadow: `0 0 0 3px ${accent}20`,
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: '4px' }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#111827',
                    marginBottom: '3px',
                    lineHeight: 1.2,
                  }}
                >
                  {ev.title}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: '#6b7280',
                    lineHeight: 1.5,
                  }}
                >
                  {ev.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 28px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {resolvedPublisher}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          {events.length} marcos históricos
        </span>
      </div>
    </div>
  );
};
