'use client';

import React from 'react';

interface InfograficoProcessoProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  brandName?: string;
  brandColor?: string;
}

export const InfograficoProcesso: React.FC<InfograficoProcessoProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#3b82f6',
}) => {
  const resolvedTitle = headline || title || name || 'Como Funciona Nosso Processo';
  const resolvedSubtitle =
    body || text || description || caption || 'Do primeiro contato à entrega final em 5 etapas simples.';
  const resolvedBrand = brandName || '';
  const accent = brandColor || '#3b82f6';

  const steps = [
    {
      num: 1,
      title: 'Briefing',
      desc: 'Entendemos suas necessidades e objetivos em uma reunião inicial.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      num: 2,
      title: 'Estratégia',
      desc: 'Desenvolvemos um plano personalizado com metas claras.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
        </svg>
      ),
    },
    {
      num: 3,
      title: 'Criação',
      desc: 'Nossa equipe produz o conteúdo com excelência e foco.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      ),
    },
    {
      num: 4,
      title: 'Revisão',
      desc: 'Você aprova e solicitamos ajustes até a perfeição.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
    },
    {
      num: 5,
      title: 'Entrega',
      desc: 'Publicamos e acompanhamos os resultados com você.',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        width: '440px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes iproc-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .iproc-card { animation: iproc-fade 0.4s ease; }
        .iproc-step:hover .iproc-circle { transform: scale(1.1); }
        .iproc-circle { transition: transform 0.2s; }
      `}</style>

      <div className="iproc-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Processo
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Steps — vertical on mobile-sized card, horizontal layout */}
        <div style={{ padding: '20px 20px 8px' }}>
          {/* Horizontal flow */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
            {steps.map((step, i) => (
              <div
                key={step.num}
                className="iproc-step"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '22px',
                      left: '50%',
                      right: '-50%',
                      height: '2px',
                      background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
                      zIndex: 0,
                    }}
                  />
                )}

                {/* Circle */}
                <div
                  className="iproc-circle"
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    zIndex: 1,
                    boxShadow: `0 4px 12px ${accent}44`,
                    marginBottom: '10px',
                  }}
                >
                  {step.icon}
                </div>

                {/* Step number badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    left: 'calc(50% + 14px)',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: `2px solid ${accent}`,
                    color: accent,
                    fontSize: '8px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  {step.num}
                </div>

                {/* Label */}
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827', textAlign: 'center', marginBottom: '4px' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280', textAlign: 'center', lineHeight: 1.4, padding: '0 2px' }}>
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress indicator */}
        <div style={{ padding: '14px 20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Progresso típico do projeto</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: accent }}>5–14 dias</span>
          </div>
          <div style={{ height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: '100%',
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}88 100%)`,
                borderRadius: '3px',
              }}
            />
          </div>
          {resolvedBrand && (
            <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px' }}>{resolvedBrand}</div>
          )}
        </div>
      </div>
    </div>
  );
};
