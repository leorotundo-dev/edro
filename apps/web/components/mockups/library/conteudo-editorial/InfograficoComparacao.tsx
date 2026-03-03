'use client';

import React from 'react';

interface InfograficoComparacaoProps {
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

export const InfograficoComparacao: React.FC<InfograficoComparacaoProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#6366f1',
}) => {
  const resolvedTitle = headline || title || name || 'Comparação de Planos';
  const resolvedSubtitle =
    body || text || description || caption ||
    'Veja as principais diferenças entre as opções disponíveis.';
  const resolvedBrand = brandName || 'Pro';
  const accent = brandColor || '#6366f1';

  const features = [
    { label: 'Acesso ilimitado ao conteúdo', a: true, b: false },
    { label: 'Suporte prioritário 24/7', a: true, b: false },
    { label: 'Relatórios avançados de dados', a: true, b: false },
    { label: 'Integrações com terceiros', a: true, b: true },
    { label: 'Exportação em múltiplos formatos', a: true, b: false },
  ];

  const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const XIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );

  return (
    <div
      style={{
        width: '400px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes icmp-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .icmp-card { animation: icmp-fade 0.4s ease; }
        .icmp-row:nth-child(even) { background: #fafafa; }
      `}</style>

      <div className="icmp-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
            padding: '18px 22px 14px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · A vs B
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 88px 88px',
            padding: '12px 20px 8px',
            borderBottom: '2px solid #f3f4f6',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>Funcionalidade</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div
              style={{
                background: accent,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
              }}
            >
              {resolvedBrand}
            </div>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>Plano A</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
            <div
              style={{
                background: '#e5e7eb',
                color: '#6b7280',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
              }}
            >
              Básico
            </div>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>Plano B</span>
          </div>
        </div>

        {/* Feature rows */}
        <div style={{ padding: '4px 0 8px' }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="icmp-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 88px 88px',
                padding: '12px 20px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.35 }}>{f.label}</span>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: f.a ? '#d1fae5' : '#fee2e2',
                    color: f.a ? '#059669' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {f.a ? <CheckIcon /> : <XIcon />}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: f.b ? '#d1fae5' : '#fee2e2',
                    color: f.b ? '#059669' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {f.b ? <CheckIcon /> : <XIcon />}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Score bar */}
        <div style={{ padding: '0 20px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: accent }}>Plano A: 5/5</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280' }}>Plano B: 1/5</span>
          </div>
          <div style={{ height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '100%', background: `linear-gradient(90deg, ${accent} 0%, ${accent} 80%, #e5e7eb 80%)`, borderRadius: '4px' }} />
          </div>
          <div
            style={{
              marginTop: '10px',
              background: `${accent}10`,
              border: `1px solid ${accent}25`,
              borderRadius: '8px',
              padding: '9px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            <span style={{ fontSize: '12px', color: accent, fontWeight: 700 }}>
              Plano A vence em 4 de 5 critérios avaliados
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
