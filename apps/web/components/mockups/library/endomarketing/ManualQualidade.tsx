'use client';

import React from 'react';

interface ManualQualidadeProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const ManualQualidade: React.FC<ManualQualidadeProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#0891b2',
  name = 'Gestão da Qualidade',
  title = 'Manual de Qualidade',
  headline = 'Sistema de Gestão da Qualidade — ISO 9001:2015',
  body = 'Esta organização está comprometida em fornecer produtos e serviços que atendam e superem as expectativas dos clientes, por meio da melhoria contínua dos processos e do comprometimento de todas as partes interessadas.',
  image = '',
}) => {
  const objetivos = [
    { num: 'OQ-01', titulo: 'Satisfação do Cliente', meta: '≥ 90% NPS', desc: 'Manter índice de satisfação superior a 90% medido trimestralmente.' },
    { num: 'OQ-02', titulo: 'Redução de Não Conformidades', meta: '< 2% ao mês', desc: 'Reduzir o índice de não conformidades internas para menos de 2% ao mês.' },
    { num: 'OQ-03', titulo: 'Entrega no Prazo', meta: '≥ 95% OTD', desc: 'Garantir que 95% das entregas ocorram dentro do prazo acordado com o cliente.' },
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
        @keyframes mq-in { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .mq-obj { animation: mq-in 0.35s ease both; }
        .mq-obj:nth-child(1){animation-delay:0.1s}
        .mq-obj:nth-child(2){animation-delay:0.2s}
        .mq-obj:nth-child(3){animation-delay:0.3s}
      `}</style>

      {/* Header estilo ISO */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #0e7490 100%)`,
        padding: '20px 22px 16px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {image ? (
                  <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
                ) : (
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                )}
              </div>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, letterSpacing: 0.8 }}>{brandName}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>{name}</div>
              </div>
            </div>
            <h1 style={{ color: 'white', fontSize: 15, fontWeight: 900, margin: '0 0 3px', lineHeight: 1.2 }}>{title}</h1>
          </div>
          {/* Selo ISO */}
          <div style={{
            background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.4)',
            borderRadius: 6, padding: '6px 10px', textAlign: 'center', flexShrink: 0,
          }}>
            <div style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>ISO</div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: 700 }}>9001:2015</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 7 }}>Certificado</div>
          </div>
        </div>
      </div>

      {/* Faixa ref */}
      <div style={{
        background: '#f0f9ff', borderBottom: '1px solid #bae6fd',
        padding: '7px 20px',
      }}>
        <span style={{ color: '#0369a1', fontSize: 9, fontWeight: 700 }}>{headline}</span>
      </div>

      {/* Política de qualidade */}
      <div style={{ padding: '14px 20px 10px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Política da Qualidade
        </div>
        <div style={{
          background: `${brandColor}0a`, border: `1px solid ${brandColor}20`,
          borderLeft: `3px solid ${brandColor}`, borderRadius: '0 6px 6px 0',
          padding: '10px 12px',
        }}>
          <p style={{ color: '#374151', fontSize: 10, lineHeight: 1.65, margin: 0, fontStyle: 'italic' }}>
            "{body}"
          </p>
        </div>
      </div>

      {/* Objetivos da qualidade */}
      <div style={{ flex: 1, padding: '0 20px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Objetivos da Qualidade
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {objetivos.map((obj, i) => (
            <div key={i} className="mq-obj" style={{
              background: '#f9fafb', borderRadius: 7,
              border: '1px solid #e5e7eb', padding: '9px 12px',
              display: 'flex', gap: 10,
            }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{
                  background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
                  borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap',
                }}>
                  <span style={{ color: brandColor, fontSize: 8, fontWeight: 800 }}>{obj.num}</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#111827', fontSize: 10, fontWeight: 700 }}>{obj.titulo}</span>
                  <span style={{
                    background: '#dcfce7', border: '1px solid #86efac',
                    color: '#166534', fontSize: 8, fontWeight: 700,
                    padding: '2px 6px', borderRadius: 3,
                  }}>{obj.meta}</span>
                </div>
                <p style={{ color: '#6b7280', fontSize: 9, margin: 0, lineHeight: 1.4 }}>{obj.desc}</p>
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
        <span style={{ color: '#9ca3af', fontSize: 9 }}>Rev. 05 · Jan/2025 · Diretor de Qualidade</span>
        <span style={{ background: brandColor, color: 'white', fontSize: 8, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>A4</span>
      </div>
    </div>
  );
};
