'use client';

import React from 'react';

interface PoliticaHomeOfficeProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const PoliticaHomeOffice: React.FC<PoliticaHomeOfficeProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#0891b2',
  name = 'Recursos Humanos',
  title = 'Política de Home Office',
  headline = 'Modelo de Trabalho Híbrido — 2025',
  body = 'Esta política regula o trabalho remoto e híbrido, definindo critérios de elegibilidade, responsabilidades do colaborador e requisitos de segurança da informação.',
  image = '',
}) => {
  const criterios = [
    { label: 'Tempo de empresa', valor: 'Mínimo 3 meses', ok: true },
    { label: 'Avaliação de desempenho', valor: 'Conceito Bom ou superior', ok: true },
    { label: 'Infraestrutura em casa', valor: 'Internet ≥ 50 Mbps + mesa', ok: true },
    { label: 'Aprovação do gestor', valor: 'Obrigatória por escrito', ok: false },
  ];

  const horarios = [
    { dia: 'Seg–Sex', janela: '08h00 – 18h00', tipo: 'Disponibilidade' },
    { dia: 'Core hours', janela: '10h00 – 16h00', tipo: 'Presença obrigatória' },
    { dia: 'Reuniões', janela: 'Câmera ligada', tipo: 'Requisito' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 10, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      border: '1px solid #e5e7eb',
    }}>
      <style>{`
        @keyframes pho-row { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .pho-row { animation: pho-row 0.3s ease both; }
        .pho-row:nth-child(1){animation-delay:0.05s}
        .pho-row:nth-child(2){animation-delay:0.12s}
        .pho-row:nth-child(3){animation-delay:0.19s}
        .pho-row:nth-child(4){animation-delay:0.26s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #0e7490 100%)`,
        padding: '22px 26px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {image ? (
              <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 16, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)', display: 'inline-block',
          borderRadius: 5, padding: '4px 10px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 600 }}>{headline}</span>
        </div>
      </div>

      {/* Intro */}
      <div style={{ padding: '14px 24px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Critérios de elegibilidade */}
      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Critérios de elegibilidade
        </div>
        {criterios.map((c, i) => (
          <div key={i} className="pho-row" style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '8px 10px', borderRadius: 7, marginBottom: 5,
            background: c.ok ? '#f0fdf4' : '#fef9c3',
            border: `1px solid ${c.ok ? '#bbf7d0' : '#fde68a'}`,
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: c.ok ? '#22c55e' : '#fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 1,
            }}>
              {c.ok ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
            </div>
            <div>
              <div style={{ color: '#111827', fontSize: 11, fontWeight: 700 }}>{c.label}</div>
              <div style={{ color: '#6b7280', fontSize: 10 }}>{c.valor}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Horários */}
      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Regras de disponibilidade
        </div>
        {horarios.map((h, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 0', borderBottom: i < horarios.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ color: '#374151', fontSize: 11, fontWeight: 600 }}>{h.dia}</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ color: brandColor, fontSize: 11, fontWeight: 700 }}>{h.janela}</span>
              <span style={{
                background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
                color: brandColor, fontSize: 8, fontWeight: 600,
                padding: '2px 6px', borderRadius: 3,
              }}>{h.tipo}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Segurança */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
          <div>
            <div style={{ color: '#1d4ed8', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>Requisitos de Segurança</div>
            <div style={{ color: '#1e40af', fontSize: 10, lineHeight: 1.4 }}>
              VPN obrigatória · Antivírus atualizado · Bloqueio automático de tela · Proibido uso de redes públicas sem VPN
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{brandName} · POL-RH-007 · 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
