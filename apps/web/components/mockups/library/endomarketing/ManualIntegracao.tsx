'use client';

import React from 'react';

interface ManualIntegracaoProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const ManualIntegracao: React.FC<ManualIntegracaoProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#059669',
  name = 'Gestão de Pessoas',
  title = 'Manual de Integração',
  headline = 'Seu roteiro para os primeiros 90 dias',
  body = 'Este guia apresenta os marcos fundamentais da sua integração. Cada etapa foi projetada para garantir que você tenha todas as ferramentas e o suporte necessários para se sentir parte do time.',
  image = '',
}) => {
  const etapas = [
    {
      periodo: 'Semana 1',
      cor: '#059669',
      milestones: [
        { label: 'Configuração do ambiente de trabalho', ok: true },
        { label: 'Reunião de boas-vindas com o gestor', ok: true },
        { label: 'Visita às instalações e apresentações', ok: true },
        { label: 'Acesso a sistemas e ferramentas', ok: false },
      ],
    },
    {
      periodo: 'Mês 1',
      cor: '#3b82f6',
      milestones: [
        { label: 'Treinamento de produtos/serviços', ok: false },
        { label: 'Imersão na cultura organizacional', ok: false },
        { label: 'Primeira entrega / projeto piloto', ok: false },
      ],
    },
    {
      periodo: '90 Dias',
      cor: '#8b5cf6',
      milestones: [
        { label: 'Avaliação de período de experiência', ok: false },
        { label: 'Definição de metas individuais (OKRs)', ok: false },
        { label: 'Feedback 360° com o time', ok: false },
      ],
    },
  ];

  return (
    <div style={{
      width: 300, minHeight: 424,
      background: '#ffffff',
      borderRadius: 8, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      display: 'flex', flexDirection: 'column',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`
        @keyframes mi-slide { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .mi-etapa { animation: mi-slide 0.4s ease both; }
        .mi-etapa:nth-child(1){animation-delay:0.1s}
        .mi-etapa:nth-child(2){animation-delay:0.2s}
        .mi-etapa:nth-child(3){animation-delay:0.3s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}bb 100%)`,
        padding: '24px 22px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -25, right: -25, width: 90, height: 90,
          borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          {image ? (
            <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          )}
        </div>
        <h1 style={{ color: 'white', fontSize: 16, fontWeight: 900, margin: '0 0 4px', lineHeight: 1.2 }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
      </div>

      {/* Subtítulo */}
      <div style={{ padding: '14px 20px 10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: `${brandColor}10`, borderRadius: 6, padding: '8px 12px',
          border: `1px solid ${brandColor}20`,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span style={{ color: brandColor, fontSize: 10, fontWeight: 600 }}>{headline}</span>
        </div>
        <p style={{ color: '#6b7280', fontSize: 10, lineHeight: 1.5, marginTop: 10, marginBottom: 0 }}>{body}</p>
      </div>

      {/* Etapas */}
      <div style={{ flex: 1, padding: '0 20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {etapas.map((etapa, ei) => (
          <div key={ei} className="mi-etapa" style={{
            border: `1px solid ${etapa.cor}25`,
            borderRadius: 8, overflow: 'hidden',
          }}>
            <div style={{
              background: `${etapa.cor}15`, borderBottom: `1px solid ${etapa.cor}20`,
              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%',
                background: etapa.cor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ color: etapa.cor, fontSize: 11, fontWeight: 800 }}>{etapa.periodo}</span>
              <span style={{ color: '#9ca3af', fontSize: 9, marginLeft: 'auto' }}>
                {etapa.milestones.filter(m => m.ok).length}/{etapa.milestones.length} concluídos
              </span>
            </div>
            <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              {etapa.milestones.map((m, mi) => (
                <div key={mi} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: m.ok ? 'none' : `1.5px solid #d1d5db`,
                    background: m.ok ? etapa.cor : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {m.ok && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ color: m.ok ? '#374151' : '#9ca3af', fontSize: 10, textDecoration: m.ok ? 'none' : 'none' }}>
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>Onboarding 2025 · RH</span>
        <span style={{ background: brandColor, color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>A4</span>
      </div>
    </div>
  );
};
