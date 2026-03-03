'use client';

import React, { useState } from 'react';

interface SlideExercicioProps {
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

export const SlideExercicio: React.FC<SlideExercicioProps> = ({
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
  const [submitted, setSubmitted] = useState(false);

  const resolvedTitle = title ?? headline ?? 'Exercício';
  const resolvedQuestion =
    body ?? text ?? description ??
    'Dada a função f(x) = 3x² − 12x + 5, qual é o valor de x no ponto de mínimo da parábola?';
  const resolvedInstitution = brandName ?? name ?? username ?? 'EduTech';
  const resolvedNote = caption ?? 'Aplique a fórmula do vértice: x = −b / 2a';
  const accent = brandColor;

  const correctIndex = 1;
  const options = [
    { label: 'A', text: 'x = 1' },
    { label: 'B', text: 'x = 2' },
    { label: 'C', text: 'x = 3' },
    { label: 'D', text: 'x = −2' },
  ];

  const getOptionStyle = (i: number): React.CSSProperties => {
    const base: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 14px',
      borderRadius: '8px',
      cursor: submitted ? 'default' : 'pointer',
      border: '2px solid',
      transition: 'all 0.15s',
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: 'system-ui, sans-serif',
    };
    if (!submitted) {
      return {
        ...base,
        borderColor: selected === i ? accent : '#e2e8f0',
        background: selected === i ? `${accent}10` : '#ffffff',
        color: selected === i ? accent : '#374151',
      };
    }
    if (i === correctIndex) {
      return { ...base, borderColor: '#16a34a', background: '#dcfce7', color: '#15803d' };
    }
    if (selected === i && i !== correctIndex) {
      return { ...base, borderColor: '#dc2626', background: '#fee2e2', color: '#b91c1c' };
    }
    return { ...base, borderColor: '#e2e8f0', background: '#f9fafb', color: '#9ca3af' };
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: 'system-ui, sans-serif',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          background: accent,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px' }}>
            {resolvedTitle}
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedInstitution}
        </span>
      </div>

      {/* Question */}
      <div style={{ padding: '16px 20px 10px', flexShrink: 0 }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>
          Questão
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: '#0f172a',
            lineHeight: 1.55,
          }}
        >
          {resolvedQuestion}
        </p>
      </div>

      {/* Options */}
      <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
        {options.map((opt, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Opção ${opt.label}: ${opt.text}`}
            onClick={() => { if (!submitted) setSelected(i); }}
            style={getOptionStyle(i)}
          >
            <span
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: submitted && i === correctIndex ? '#16a34a' : submitted && selected === i ? '#dc2626' : selected === i ? accent : '#e2e8f0',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {opt.label}
            </span>
            {opt.text}
          </button>
        ))}
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>{resolvedNote}</span>
        {!submitted ? (
          <button
            type="button"
            aria-label="Confirmar resposta"
            onClick={() => { if (selected !== null) setSubmitted(true); }}
            style={{
              background: selected !== null ? accent : '#e2e8f0',
              color: selected !== null ? '#ffffff' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: selected !== null ? 'pointer' : 'not-allowed',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Confirmar
          </button>
        ) : (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: selected === correctIndex ? '#16a34a' : '#dc2626',
            }}
          >
            {selected === correctIndex ? 'Correto!' : `Incorreto — resposta: ${options[correctIndex].text}`}
          </span>
        )}
      </div>

      {/* Slide number */}
      <div style={{ position: 'absolute', bottom: '8px', right: '10px', fontSize: '10px', color: '#cbd5e1', fontWeight: 700 }}>
        03
      </div>
    </div>
  );
};
