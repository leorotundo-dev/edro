'use client';

import React from 'react';

interface InfograficoEducativoProps {
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

export const InfograficoEducativo: React.FC<InfograficoEducativoProps> = ({
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
  const resolvedTitle = title ?? headline ?? '5 Fatos sobre Aprendizado';
  const resolvedSubtitle = description ?? caption ?? body ?? text ?? 'Dados baseados em pesquisas científicas recentes';
  const resolvedPublisher = brandName ?? name ?? username ?? 'EduStats';
  const accent = brandColor;

  const facts = [
    { num: '87%', label: 'dos estudantes aprendem melhor com exemplos práticos', color: '#6366f1' },
    { num: '26min', label: 'é o tempo médio para recuperar o foco após uma distração', color: '#f59e0b' },
    { num: '3×', label: 'mais retenção com repetição espaçada vs. estudo maçante', color: '#10b981' },
    { num: '70%', label: 'do conteúdo é esquecido em 24h sem revisão ativa', color: '#ef4444' },
    { num: '20min', label: 'de exercício físico melhora a cognição imediatamente', color: '#8b5cf6' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '460px',
        background: '#0f172a',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
        fontFamily: 'system-ui, sans-serif',
        padding: '32px 28px 24px',
      }}
    >
      {/* Decorative top accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accent}, #a855f7, #ec4899)`,
        }}
      />

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: accent,
            marginBottom: '8px',
          }}
        >
          {resolvedPublisher} · Infográfico
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.2,
            marginBottom: '6px',
          }}
        >
          {resolvedTitle}
        </h1>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
          {resolvedSubtitle}
        </p>
      </div>

      {/* Fact blocks */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {facts.map((fact, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: '10px',
              padding: '14px 18px',
              border: `1px solid ${fact.color}30`,
            }}
          >
            {/* Big number */}
            <div
              style={{
                minWidth: '72px',
                fontSize: '26px',
                fontWeight: 900,
                color: fact.color,
                lineHeight: 1,
                textAlign: 'right',
              }}
            >
              {fact.num}
            </div>

            {/* Vertical divider */}
            <div
              style={{
                width: '2px',
                height: '36px',
                background: `${fact.color}50`,
                borderRadius: '2px',
                flexShrink: 0,
              }}
            />

            {/* Label */}
            <div
              style={{
                fontSize: '13px',
                color: '#cbd5e1',
                lineHeight: 1.5,
                flex: 1,
              }}
            >
              {fact.label}
            </div>

            {/* Index */}
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: `${fact.color}25`,
                color: fact.color,
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: '20px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10px', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Fontes: pesquisas 2024–2025
        </span>
        <span style={{ fontSize: '10px', color: '#475569' }}>
          {resolvedPublisher}
        </span>
      </div>
    </div>
  );
};
