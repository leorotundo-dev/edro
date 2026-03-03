'use client';

import React from 'react';

interface TutorialProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const Tutorial: React.FC<TutorialProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  description,
  caption,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#7c3aed',
}) => {
  const accent = brandColor || '#7c3aed';
  const resolvedTitle =
    headline || title || 'Como Criar Conteúdo Escalável com IA em 5 Passos';
  const resolvedAuthor = brandName || name || username || 'Edro Digital';
  const resolvedBody =
    body || text || description || caption ||
    'Aprenda a utilizar ferramentas de inteligência artificial para criar conteúdo editorial de alta qualidade de forma consistente, sem sacrificar autenticidade ou relevância para o seu público.';
  const resolvedThumb = image || postImage || thumbnail || profileImage || null;

  const totalSteps = 5;
  const currentStep = 2;
  const estimatedTime = '~15 min';
  const category = 'Marketing de Conteúdo';

  const steps = [
    {
      title: 'Defina sua estratégia editorial',
      description:
        'Antes de qualquer automação, mapeie seus pilares de conteúdo, persona-alvo e voz de marca. Uma estratégia sólida é o alicerce para qualquer produção escalável.',
      tip: 'Dica: use a matriz de conteúdo 2×2 (entretenimento vs. educação × produto vs. mercado) para mapear seus pilares.',
      tipType: 'tip',
    },
    {
      title: 'Configure seu prompt mestre',
      description:
        'Crie um prompt-base que encapsule tom de voz, restrições e objetivos. Este prompt será reaproveitado em todos os conteúdos, garantindo consistência.',
      tip: 'system: "Você é redator sênior da [marca]. Tom: direto, especialista. Evite: jargões técnicos, superlativo."',
      tipType: 'code',
    },
    {
      title: 'Gere rascunhos em lote',
      description:
        'Utilize a geração em lote para criar variações de título, lead e CTA para cada peça. Produza ao menos 3 variantes e aplique testes A/B nos canais de maior tráfego.',
      tip: 'Dica: gere 10 títulos de uma vez e filtre os 2 melhores. É mais eficiente do que iterar um por vez.',
      tipType: 'tip',
    },
    {
      title: 'Revise e humanize',
      description:
        'Passe cada rascunho por uma revisão editorial humana. Adicione exemplos reais, dados proprietários e ajuste a voz para soar autêntica. A IA entrega estrutura; o editor entrega alma.',
      tip: null,
      tipType: null,
    },
    {
      title: 'Meça, aprenda e itere',
      description:
        'Configure métricas de desempenho (taxa de abertura, tempo de leitura, conversão) e alimente esses dados de volta ao processo. O ciclo de melhoria contínua é o que separa conteúdo bom de conteúdo excelente.',
      tip: 'KPIs essenciais: taxa de conclusão de leitura >60%, CTR de CTA >3,5%, compartilhamentos orgânicos.',
      tipType: 'tip',
    },
  ];

  const prerequisites = [
    'Conta ativa em uma plataforma de IA generativa (Edro AI Suite, ChatGPT, Gemini)',
    'Documento de guia de estilo da marca (brand voice guidelines)',
    'Acesso ao seu CMS ou ferramenta de gestão de conteúdo',
  ];

  const progressPct = Math.round((currentStep / totalSteps) * 100);

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-block' }}>
      <style>{`
        @keyframes tut-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tut-wrap { animation: tut-fade 0.4s ease; }
      `}</style>

      <div
        className="tut-wrap"
        style={{
          width: '420px',
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.09)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 20px 16px',
          }}
        >
          {/* Category badge + time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 800,
                background: 'rgba(255,255,255,0.2)',
                color: '#fff',
                padding: '3px 9px',
                borderRadius: '12px',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {category}
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '10px',
                color: 'rgba(255,255,255,0.75)',
                fontWeight: 600,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {estimatedTime}
            </div>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '16px',
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1.3,
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}
          >
            {resolvedTitle}
          </h1>

          {/* Author + thumbnail */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>
              por <strong style={{ color: 'rgba(255,255,255,0.9)' }}>{resolvedAuthor}</strong>
            </div>
            {resolvedThumb && (
              <img
                src={resolvedThumb}
                alt="thumbnail"
                style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}
              />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280' }}>
              Etapa {currentStep} de {totalSteps}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: accent }}>
              {progressPct}% concluído
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: '#e5e7eb',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${accent} 0%, ${accent}cc 100%)`,
                borderRadius: '3px',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div style={{ padding: '16px 20px 12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {steps.map((step, i) => {
              const isCompleted = i + 1 < currentStep;
              const isCurrent = i + 1 === currentStep;
              const stepNum = i + 1;

              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    paddingBottom: i < steps.length - 1 ? '14px' : 0,
                    position: 'relative',
                  }}
                >
                  {/* Connector line */}
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '28px',
                        width: '2px',
                        height: 'calc(100% - 14px)',
                        background: isCompleted ? accent : '#e5e7eb',
                      }}
                    />
                  )}

                  {/* Step number circle */}
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isCompleted
                        ? accent
                        : isCurrent
                        ? accent
                        : '#f3f4f6',
                      border: isCurrent ? `2px solid ${accent}` : isCompleted ? 'none' : '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {isCompleted ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 900,
                          color: isCurrent ? '#fff' : '#9ca3af',
                          lineHeight: 1,
                        }}
                      >
                        {stepNum}
                      </span>
                    )}
                  </div>

                  {/* Step content */}
                  <div style={{ flex: 1, paddingTop: '4px' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isCurrent ? '#111827' : isCompleted ? '#374151' : '#9ca3af',
                        marginBottom: '4px',
                        lineHeight: 1.3,
                      }}
                    >
                      {step.title}
                    </div>
                    <p
                      style={{
                        fontSize: '12px',
                        color: isCurrent ? '#4b5563' : isCompleted ? '#6b7280' : '#9ca3af',
                        lineHeight: 1.55,
                        margin: '0 0 6px',
                      }}
                    >
                      {step.description}
                    </p>

                    {/* Tip / code callout */}
                    {step.tip && (isCurrent || isCompleted) && (
                      <div
                        style={{
                          background: step.tipType === 'code' ? '#1e1e2e' : `${accent}0d`,
                          border: step.tipType === 'code'
                            ? '1px solid #2d2d3f'
                            : `1px solid ${accent}28`,
                          borderRadius: '6px',
                          padding: '8px 10px',
                          marginTop: '6px',
                        }}
                      >
                        {step.tipType === 'code' ? (
                          <code
                            style={{
                              fontSize: '10px',
                              color: '#a5f3fc',
                              fontFamily: "'Fira Code', 'Courier New', monospace",
                              lineHeight: 1.5,
                              display: 'block',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            }}
                          >
                            {step.tip}
                          </code>
                        ) : (
                          <p
                            style={{
                              fontSize: '11px',
                              color: accent,
                              margin: 0,
                              lineHeight: 1.5,
                              fontWeight: 500,
                            }}
                          >
                            {step.tip}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Prerequisites section */}
        <div
          style={{
            margin: '0 20px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '10px',
              fontWeight: 800,
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Pré-requisitos
          </div>
          {prerequisites.map((req, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '7px',
                marginBottom: i < prerequisites.length - 1 ? '5px' : 0,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '3px',
                  border: `2px solid ${accent}44`,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              />
              <span style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.45 }}>{req}</span>
            </div>
          ))}
        </div>

        {/* Description blurb */}
        <div style={{ padding: '0 20px 14px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            {resolvedBody}
          </p>
        </div>

        {/* CTA */}
        <div
          style={{
            padding: '14px 20px 18px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            type="button"
            aria-label="Começar o tutorial de criação de conteúdo com IA"
            style={{
              flex: 1,
              background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '11px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              boxShadow: `0 4px 12px ${accent}44`,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Começar Tutorial
          </button>
          <button
            type="button"
            aria-label="Salvar tutorial para ler depois"
            style={{
              background: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '11px 14px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6b7280',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
