'use client';

import React from 'react';

interface PoliticaBeneficiosProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const PoliticaBeneficios: React.FC<PoliticaBeneficiosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#059669',
  name = 'Recursos Humanos',
  title = 'Política de Benefícios',
  headline = 'Vigência: 01/01/2025 — 31/12/2025',
  body = 'Esta política descreve os benefícios oferecidos pela empresa aos colaboradores elegíveis, conforme as categorias e valores definidos abaixo.',
  image = '',
}) => {
  const beneficios = [
    { icone: '🏥', nome: 'Plano de Saúde', cobertura: 'R$ 0 co-participação', elegivel: 'A partir do 1º dia', cor: '#3b82f6' },
    { icone: '🦷', nome: 'Plano Odontológico', cobertura: 'R$ 0 co-participação', elegivel: 'A partir do 1º dia', cor: '#8b5cf6' },
    { icone: '🍽️', nome: 'Vale-Refeição', cobertura: 'R$ 38,00/dia', elegivel: 'Imediato', cor: '#f59e0b' },
    { icone: '🚌', nome: 'Vale-Transporte', cobertura: 'Conforme trajeto', elegivel: 'Imediato', cor: '#06b6d4' },
    { icone: '🛡️', nome: 'Seguro de Vida', cobertura: 'R$ 200.000,00', elegivel: 'A partir do 1º dia', cor: '#ef4444' },
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
        @keyframes pb-row { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .pb-row { animation: pb-row 0.35s ease both; }
        .pb-row:nth-child(1){animation-delay:0.05s}
        .pb-row:nth-child(2){animation-delay:0.12s}
        .pb-row:nth-child(3){animation-delay:0.19s}
        .pb-row:nth-child(4){animation-delay:0.26s}
        .pb-row:nth-child(5){animation-delay:0.33s}
      `}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}bb 100%)`,
        padding: '22px 26px 18px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {image ? (
              <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 18, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '6px 12px',
          display: 'inline-block',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 600 }}>{headline}</span>
        </div>
      </div>

      {/* Intro */}
      <div style={{ padding: '14px 24px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Tabela de benefícios */}
      <div style={{ padding: '0 24px 10px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Resumo dos benefícios
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.4fr',
          background: '#f3f4f6', borderRadius: '6px 6px 0 0',
          padding: '6px 10px', borderBottom: '1px solid #e5e7eb',
        }}>
          {['Benefício', 'Cobertura', 'Elegibilidade'].map((h, i) => (
            <span key={i} style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>{h}</span>
          ))}
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 6px 6px', overflow: 'hidden' }}>
          {beneficios.map((b, i) => (
            <div key={i} className="pb-row" style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.4fr',
              padding: '9px 10px', alignItems: 'center',
              borderBottom: i < beneficios.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: i % 2 === 0 ? '#ffffff' : '#fafafa',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 16 }}>{b.icone}</span>
                <span style={{ color: '#111827', fontSize: 11, fontWeight: 600 }}>{b.nome}</span>
              </div>
              <span style={{ color: b.cor, fontSize: 10, fontWeight: 700 }}>{b.cobertura}</span>
              <span style={{
                background: `${b.cor}12`, border: `1px solid ${b.cor}30`,
                color: b.cor, fontSize: 8, fontWeight: 600,
                padding: '2px 6px', borderRadius: 3, display: 'inline-block',
              }}>{b.elegivel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Nota */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{
          background: '#f0fdf4', border: '1px solid #bbf7d0',
          borderRadius: 8, padding: '10px 14px',
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div>
            <div style={{ color: '#15803d', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>Dúvidas sobre seus benefícios?</div>
            <div style={{ color: '#166534', fontSize: 10 }}>Acesse o portal do colaborador ou fale com o RH pelo ramal 200.</div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{brandName} · Política POL-RH-003 · 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
