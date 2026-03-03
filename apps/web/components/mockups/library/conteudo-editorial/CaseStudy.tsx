'use client';

import React from 'react';

interface CaseStudyProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const CaseStudy: React.FC<CaseStudyProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#0f172a',
}) => {
  const resolvedTitle =
    headline || title || 'Como aumentamos em +240% as conversões em 90 dias';
  const resolvedCompany = brandName || name || username || 'TechStart Brasil';
  const resolvedBody =
    body ||
    text ||
    description ||
    caption ||
    'A empresa enfrentava altas taxas de abandono no funil de vendas. Implementamos uma estratégia de conteúdo personalizado e automação de marketing que transformou completamente os resultados.';
  const resolvedLogo = profileImage || image || postImage || thumbnail || null;
  const accent = brandColor || '#0f172a';

  const stats = [
    { value: '+240%', label: 'Conversões' },
    { value: '-58%', label: 'Custo por Lead' },
    { value: '3.2×', label: 'Retorno (ROI)' },
  ];

  const sections = [
    {
      label: 'Desafio',
      color: '#ef4444',
      bg: '#fef2f2',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      ),
      text: 'Baixa taxa de conversão e alto custo de aquisição impediam o crescimento sustentável.',
    },
    {
      label: 'Solução',
      color: '#3b82f6',
      bg: '#eff6ff',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
        </svg>
      ),
      text: 'Mapeamento de jornada, conteúdo segmentado por persona e nutrição automatizada de leads.',
    },
    {
      label: 'Resultados',
      color: '#10b981',
      bg: '#f0fdf4',
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      ),
      text: 'Triplicamos o ROI em 90 dias, com queda expressiva no custo por lead qualificado.',
    },
  ];

  return (
    <div
      style={{
        width: '400px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.11)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes cs-slide-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .cs-card { animation: cs-slide-in 0.4s ease; }
        .cs-cta:hover { opacity: 0.88; transform: translateY(-1px); }
        .cs-cta { transition: opacity 0.2s, transform 0.15s; }
      `}</style>
      <div className="cs-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '20px 22px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.65)',
                marginBottom: '4px',
              }}
            >
              Case de Sucesso
            </div>
            {/* Company logo / name */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {resolvedLogo ? (
                <img
                  src={resolvedLogo}
                  alt={resolvedCompany}
                  style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 800,
                  }}
                >
                  {resolvedCompany.charAt(0)}
                </div>
              )}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#fff',
                }}
              >
                {resolvedCompany}
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '8px',
              padding: '6px 10px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Setor</div>
            <div style={{ fontSize: '11px', color: '#fff', fontWeight: 700, marginTop: '1px' }}>SaaS / B2B</div>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                padding: '14px 8px',
                textAlign: 'center',
                borderRight: i < 2 ? '1px solid #f0f0f0' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 900,
                  color: accent,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: '#6b7280',
                  marginTop: '3px',
                  fontWeight: 500,
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Title */}
        <div style={{ padding: '18px 22px 12px' }}>
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.35,
              margin: '0 0 10px',
            }}
          >
            {resolvedTitle}
          </h2>
          <p
            style={{
              fontSize: '12.5px',
              color: '#4b5563',
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {resolvedBody}
          </p>
        </div>

        {/* Sections */}
        <div style={{ padding: '0 22px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sections.map((s, i) => (
            <div
              key={i}
              style={{
                background: s.bg,
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: s.color,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {s.icon}
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.5 }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: '0 22px 20px' }}>
          <button
            type="button"
            aria-label="Ler case completo"
            className="cs-cta"
            style={{
              width: '100%',
              padding: '11px',
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.01em',
            }}
          >
            Ler Case Completo
          </button>
        </div>
      </div>
    </div>
  );
};
