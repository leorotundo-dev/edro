'use client';

import React from 'react';

interface GuiaRapidoProps {
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

export const GuiaRapido: React.FC<GuiaRapidoProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Guia Rápido';
  const resolvedSubtitle = description ?? caption ?? 'Como aplicar a técnica Pomodoro';
  const resolvedTip = body ?? text ?? name ?? username ?? 'Elimine distrações antes de iniciar o timer para maximizar o foco.';
  const resolvedPublisher = brandName ?? 'EduPress';
  const accent = brandColor;

  const steps = [
    { icon: '⏱', label: 'Defina a tarefa', detail: 'Escreva claramente o que será feito na sessão' },
    { icon: '🔴', label: 'Inicie o timer', detail: 'Configure 25 minutos de foco total sem pausas' },
    { icon: '✏️', label: 'Trabalhe com foco', detail: 'Execute apenas a tarefa definida, sem multitarefas' },
    { icon: '✅', label: 'Registre o Pomodoro', detail: 'Marque a sessão concluída na sua lista de controle' },
    { icon: '☕', label: 'Faça uma pausa curta', detail: '5 minutos para relaxar antes do próximo ciclo' },
    { icon: '🔄', label: 'Repita o ciclo', detail: 'Após 4 Pomodoros, faça uma pausa longa de 15–30 min' },
  ];

  const half = Math.ceil(steps.length / 2);
  const col1 = steps.slice(0, half);
  const col2 = steps.slice(half);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '380px',
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
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
          padding: '20px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
            {resolvedPublisher}
          </div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>
            {resolvedTitle}
          </h1>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
            {resolvedSubtitle}
          </div>
        </div>
      </div>

      {/* Steps — 2 columns */}
      <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[col1, col2].map((col, ci) =>
          col.map((step, si) => {
            const stepNum = ci === 0 ? si + 1 : half + si + 1;
            return (
              <div
                key={stepNum}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  border: '1px solid #f3f4f6',
                }}
              >
                {/* Step number badge */}
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: accent,
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  {stepNum}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '2px' }}>
                    {step.icon} {step.label}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: 1.4 }}>
                    {step.detail}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tips box */}
      <div
        style={{
          margin: '0 24px 20px',
          background: `${accent}12`,
          border: `1px solid ${accent}40`,
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '10px',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
          <path d="M9 21h6" />
          <path d="M12 3C8.5 3 6 6 6 9c0 2.5 1.5 4.5 3 5.5V17h6v-2.5c1.5-1 3-3 3-5.5 0-3-2.5-6-6-6z" />
        </svg>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>
            Dica
          </div>
          <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>
            {resolvedTip}
          </div>
        </div>
      </div>
    </div>
  );
};
