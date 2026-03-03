'use client';

import React from 'react';

interface PlanoAulaProps {
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

export const PlanoAula: React.FC<PlanoAulaProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Plano de Aula';
  const resolvedSubject = description ?? caption ?? 'Matemática — Funções do 2º Grau';
  const resolvedTeacher = name ?? username ?? 'Prof. Carlos Menezes';
  const resolvedPublisher = brandName ?? 'EduPlan';
  const resolvedNote = body ?? text ?? 'Adaptar atividades conforme o ritmo da turma.';
  const accent = brandColor;

  const sections = [
    {
      label: 'Objetivo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      ),
      content: 'Compreender a estrutura das funções quadráticas e identificar seus elementos: vértice, raízes e eixo de simetria.',
    },
    {
      label: 'Conteúdo',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      ),
      content: 'Definição de função quadrática f(x) = ax² + bx + c. Gráfico da parábola. Discriminante (Δ) e análise das raízes reais.',
    },
    {
      label: 'Metodologia',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
      content: 'Aula expositiva com exemplos visuais no quadro. Resolução guiada em duplas. Discussão coletiva dos resultados.',
    },
    {
      label: 'Recursos',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
        </svg>
      ),
      content: 'Quadro branco, projetor, fichas impressas com exercícios, calculadoras científicas, software GeoGebra.',
    },
    {
      label: 'Avaliação',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
      content: 'Lista de exercícios com 6 questões (2 básicas, 2 intermediárias, 2 desafio). Correção em aula na próxima sessão.',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
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
          padding: '18px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
              {resolvedPublisher}
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
              {resolvedTitle}
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              {resolvedSubject}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>Professora</div>
            <div style={{ fontSize: '12px', color: '#ffffff', fontWeight: 700 }}>{resolvedTeacher}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}>50 min · 1 aula</div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{ padding: '16px 24px 8px' }}>
        {sections.map((sec, i) => (
          <div
            key={i}
            style={{
              marginBottom: '12px',
              borderLeft: `3px solid ${accent}`,
              paddingLeft: '14px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: accent,
                marginBottom: '4px',
              }}
            >
              {sec.icon}
              <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>
                {sec.label}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#374151', lineHeight: 1.6 }}>
              {sec.content}
            </p>
          </div>
        ))}
      </div>

      {/* Observation note */}
      <div
        style={{
          margin: '0 24px 16px',
          background: `${accent}0e`,
          border: `1px dashed ${accent}50`,
          borderRadius: '6px',
          padding: '10px 14px',
          fontSize: '11px',
          color: '#6b7280',
          fontStyle: 'italic',
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: accent, fontStyle: 'normal' }}>Observação: </strong>
        {resolvedNote}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '8px 24px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {resolvedPublisher}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          {sections.length} seções
        </span>
      </div>
    </div>
  );
};
