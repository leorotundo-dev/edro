'use client';

import React, { useState } from 'react';

interface WorkbookProps {
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

export const Workbook: React.FC<WorkbookProps> = ({
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
  const [checked, setChecked] = useState<boolean[]>([false, false, false]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);

  const resolvedTitle = title ?? headline ?? 'Workbook de Prática';
  const resolvedSubtitle = description ?? caption ?? 'Derivadas — Exercícios Guiados';
  const resolvedAuthor = name ?? username ?? 'Aluno(a)';
  const resolvedPublisher = brandName ?? 'EduPress';
  const resolvedExample = body ?? text ?? 'f(x) = 4x³ − 9x² + 6x − 1  →  f\'(x) = 12x² − 18x + 6';
  const accent = brandColor;

  const completedCount = checked.filter(Boolean).length;
  const progressPct = Math.round((completedCount / checked.length) * 100);

  const exercises = [
    { prompt: 'Calcule a derivada de g(x) = 7x⁴ − 3x² + 5x − 2' },
    { prompt: 'Encontre o ponto crítico de h(x) = x² − 6x + 8 e classifique-o.' },
    { prompt: 'Aplique a regra do produto: p(x) = (2x + 1)(x³ − x)' },
  ];

  const toggleCheck = (i: number) => {
    setChecked(prev => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  };

  const updateAnswer = (i: number, val: string) => {
    setAnswers(prev => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '500px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '16px 24px 14px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '3px' }}>
              {resolvedPublisher}
            </div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#ffffff' }}>
              {resolvedTitle}
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.75)' }}>
              {resolvedSubtitle}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', marginBottom: '2px' }}>Aluno(a)</div>
            <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700 }}>{resolvedAuthor}</div>
          </div>
        </div>

        {/* Progress tracker */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>Progresso</span>
            <span style={{ fontSize: '10px', color: '#ffffff', fontWeight: 700 }}>
              {completedCount}/{checked.length} exercícios — {progressPct}%
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: '#ffffff',
                borderRadius: '99px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Example section */}
      <div style={{ padding: '18px 24px 0', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Exemplo Resolvido
          </span>
        </div>
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px 16px',
            fontSize: '12px',
            color: '#92400e',
            fontFamily: 'monospace',
            lineHeight: 1.6,
          }}
        >
          {resolvedExample}
        </div>
      </div>

      {/* Practice section */}
      <div style={{ padding: '16px 24px 20px', flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
          <span style={{ fontSize: '11px', fontWeight: 800, color: accent, letterSpacing: '1px', textTransform: 'uppercase' }}>
            Sua vez — Pratique
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {exercises.map((ex, i) => (
            <div
              key={i}
              style={{
                background: checked[i] ? '#f0fdf4' : '#f9fafb',
                border: `1px solid ${checked[i] ? '#86efac' : '#e5e7eb'}`,
                borderLeft: `4px solid ${checked[i] ? '#22c55e' : accent}`,
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {/* Exercise header row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <button
                  type="button"
                  aria-label={checked[i] ? `Desmarcar exercício ${i + 1}` : `Marcar exercício ${i + 1} como concluído`}
                  onClick={() => toggleCheck(i)}
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `2px solid ${checked[i] ? '#22c55e' : '#d1d5db'}`,
                    background: checked[i] ? '#22c55e' : '#ffffff',
                    cursor: 'pointer',
                    flexShrink: 0,
                    marginTop: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {checked[i] && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
                <div>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: checked[i] ? '#16a34a' : accent, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    Exercício {i + 1}
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.5, textDecoration: checked[i] ? 'line-through' : 'none', color: checked[i] ? '#9ca3af' : '#1f2937' }}>
                    {ex.prompt}
                  </div>
                </div>
              </div>

              {/* Answer area */}
              {!checked[i] && (
                <textarea
                  aria-label={`Resposta do exercício ${i + 1}`}
                  value={answers[i]}
                  onChange={e => updateAnswer(i, e.target.value)}
                  placeholder="Escreva sua resolução aqui..."
                  rows={2}
                  style={{
                    width: '100%',
                    resize: 'none',
                    border: `1px solid ${accent}30`,
                    borderRadius: '6px',
                    padding: '7px 10px',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                    color: '#374151',
                    background: '#ffffff',
                    outline: 'none',
                    boxSizing: 'border-box',
                    lineHeight: 1.5,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          {completedCount} de {exercises.length} concluídos
        </span>
      </div>
    </div>
  );
};
