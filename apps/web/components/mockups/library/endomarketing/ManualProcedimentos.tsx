'use client';

import React from 'react';

interface ManualProcedimentosProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const ManualProcedimentos: React.FC<ManualProcedimentosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#dc2626',
  name = 'Qualidade e Processos',
  title = 'Manual de Procedimentos',
  headline = 'POP-TI-001 — Abertura de Chamado',
  body = 'Siga rigorosamente as etapas abaixo para garantir a conformidade operacional. Desvios devem ser reportados ao responsável pelo processo.',
  image = '',
}) => {
  const passos = [
    { num: 1, texto: 'Identifique o tipo do chamado (Incidente / Solicitação / Mudança)', alerta: false },
    { num: 2, texto: 'Acesse o portal de suporte: https://suporte.empresa.com.br', alerta: false },
    { num: 3, texto: 'Preencha todos os campos obrigatórios e anexe evidências', alerta: false },
    { num: 4, texto: 'Confirme recebimento do número de protocolo por e-mail', alerta: true },
    { num: 5, texto: 'Acompanhe o status pelo portal ou via ramal 195', alerta: false },
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
        @keyframes mp-step { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .mp-step { animation: mp-step 0.35s ease both; }
        .mp-step:nth-child(1){animation-delay:0.05s}
        .mp-step:nth-child(2){animation-delay:0.12s}
        .mp-step:nth-child(3){animation-delay:0.19s}
        .mp-step:nth-child(4){animation-delay:0.26s}
        .mp-step:nth-child(5){animation-delay:0.33s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #b91c1c 100%)`,
        padding: '22px 22px 16px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'rgba(255,255,255,0.2)',
          border: '1px solid rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
        }}>
          {image ? (
            <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <h1 style={{ color: 'white', fontSize: 15, fontWeight: 900, margin: 0 }}>{title}</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
      </div>

      {/* Código do procedimento */}
      <div style={{
        background: '#fef2f2', borderBottom: '1px solid #fecaca',
        padding: '9px 20px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
        <span style={{ color: brandColor, fontSize: 10, fontWeight: 700 }}>{headline}</span>
      </div>

      {/* Intro */}
      <div style={{ padding: '12px 20px 8px' }}>
        <p style={{ color: '#4b5563', fontSize: 10, lineHeight: 1.6, margin: 0 }}>{body}</p>
      </div>

      {/* Fluxograma simplificado */}
      <div style={{ padding: '4px 20px 12px', flex: 1 }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          Passo a passo
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {passos.map((p, i) => (
            <div key={i} className="mp-step" style={{ display: 'flex', gap: 0 }}>
              {/* Conector vertical */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: p.alerta ? '#fef9c3' : `${brandColor}15`,
                  border: `2px solid ${p.alerta ? '#fbbf24' : brandColor}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}>
                  <span style={{ color: p.alerta ? '#d97706' : brandColor, fontSize: 9, fontWeight: 800 }}>{p.num}</span>
                </div>
                {i < passos.length - 1 && (
                  <div style={{ width: 2, flex: 1, minHeight: 10, background: '#e5e7eb' }} />
                )}
              </div>
              {/* Conteúdo */}
              <div style={{
                flex: 1, marginLeft: 8, marginBottom: i < passos.length - 1 ? 8 : 0,
                paddingTop: 2,
              }}>
                {p.alerta ? (
                  <div style={{
                    background: '#fef9c3', border: '1px solid #fde68a',
                    borderRadius: 6, padding: '7px 10px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      <span style={{ color: '#92400e', fontSize: 9, fontWeight: 700 }}>Atenção obrigatória</span>
                    </div>
                    <p style={{ color: '#78350f', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{p.texto}</p>
                  </div>
                ) : (
                  <div style={{
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: 6, padding: '7px 10px',
                  }}>
                    <p style={{ color: '#374151', fontSize: 10, margin: 0, lineHeight: 1.4 }}>{p.texto}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>Rev. 03 · Jan/2025</span>
        <span style={{ background: brandColor, color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>A4</span>
      </div>
    </div>
  );
};
