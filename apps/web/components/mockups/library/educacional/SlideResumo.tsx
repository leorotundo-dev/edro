'use client';

import React from 'react';

interface SlideResumoProps {
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

export const SlideResumo: React.FC<SlideResumoProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Resumo da Aula';
  const resolvedSubtitle = description ?? caption ?? 'Derivadas e Aplicações — Cálculo I';
  const resolvedInstitution = brandName ?? name ?? username ?? 'EduTech';
  const resolvedNextSteps = body ?? text ?? 'Resolver lista de exercícios · Estudar integrais · Revisão na próxima aula';
  const accent = brandColor;

  const keyPoints = [
    'A derivada mede a taxa de variação instantânea de f(x) em relação a x.',
    'As regras de derivação (potência, produto, cadeia) simplificam o cálculo.',
    'Pontos críticos ocorrem onde f\'(x) = 0 — permitem encontrar máximos e mínimos.',
    'Aplicações: otimização, velocidade instantânea, análise de crescimento.',
    'O teste da segunda derivada determina se um ponto crítico é mínimo ou máximo.',
  ];

  const nextStepsList = resolvedNextSteps.split('·').map(s => s.trim()).filter(Boolean);

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
          background: `linear-gradient(90deg, ${accent}, ${accent}cc)`,
          padding: '12px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '2px' }}>
            {resolvedInstitution}
          </div>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#ffffff' }}>
            {resolvedTitle}
          </h1>
        </div>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>
          {resolvedSubtitle}
        </span>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
        {/* Left — key points */}
        <div style={{ padding: '14px 18px', borderRight: `1px solid ${accent}20` }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 800, color: accent, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Pontos-chave
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            {keyPoints.map((pt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '7px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: `${accent}18`,
                    border: `1.5px solid ${accent}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '1px',
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <span style={{ fontSize: '10px', color: '#374151', lineHeight: 1.45 }}>{pt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — próximos passos */}
        <div style={{ padding: '14px 18px', background: '#f8fafc' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#f59e0b', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Próximos Passos
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {nextStepsList.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ffffff',
                  borderRadius: '6px',
                  padding: '8px 10px',
                  border: '1px solid #e5e7eb',
                  borderLeft: '3px solid #f59e0b',
                }}
              >
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', minWidth: '16px' }}>
                  {i + 1}.
                </span>
                <span style={{ fontSize: '11px', color: '#374151', lineHeight: 1.35 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Slide number */}
      <div style={{ position: 'absolute', bottom: '8px', right: '12px', fontSize: '10px', color: '#cbd5e1', fontWeight: 700 }}>
        05
      </div>
    </div>
  );
};
