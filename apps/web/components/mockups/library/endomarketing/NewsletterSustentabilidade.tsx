'use client';

import React from 'react';

interface NewsletterSustentabilidadeProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterSustentabilidade: React.FC<NewsletterSustentabilidadeProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#16a34a',
  title = 'ESG em Ação',
  headline = 'Relatório Março 2025',
  name = 'Sustentabilidade',
  body = 'Nossa jornada ESG avança com passos concretos. Confira os números do mês, o destaque de iniciativa e como você pode contribuir.',
}) => {
  const metricas = [
    { icone: '🌿', label: 'CO₂ reduzido', valor: '12,4 t', vs: '↓ 8% vs jan', cor: '#16a34a' },
    { icone: '⚡', label: 'Energia renovável', valor: '78%', vs: '↑ 5pp vs jan', cor: '#f59e0b' },
    { icone: '♻️', label: 'Reciclagem', valor: '2,1 t', vs: '↑ 15% vs jan', cor: '#3b82f6' },
    { icone: '💧', label: 'Água economizada', valor: '340 m³', vs: '↓ 12% vs jan', cor: '#06b6d4' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes esg-leaf { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
        .esg-leaf { display:inline-block; animation: esg-leaf 4s ease-in-out infinite; }
        @keyframes esg-met { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .esg-met { animation: esg-met 0.35s ease both; }
        .esg-met:nth-child(1){animation-delay:0.05s}
        .esg-met:nth-child(2){animation-delay:0.12s}
        .esg-met:nth-child(3){animation-delay:0.19s}
        .esg-met:nth-child(4){animation-delay:0.26s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #14532d 100%)`, padding: '24px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{headline}</div>
          </div>
          <span className="esg-leaf" style={{ fontSize: 30 }}>🍃</span>
        </div>
        <h1 style={{ color: 'white', fontSize: 21, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Badge ESG */}
      <div style={{
        background: '#f0fdf4', borderBottom: '1px solid #bbf7d0',
        padding: '9px 28px', display: 'flex', gap: 8, alignItems: 'center',
      }}>
        {['E — Ambiental', 'S — Social', 'G — Governança'].map((p, i) => (
          <span key={i} style={{
            background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
            color: brandColor, fontSize: 9, fontWeight: 700,
            padding: '3px 10px', borderRadius: 20,
          }}>{p}</span>
        ))}
      </div>

      {/* Métricas */}
      <div style={{ padding: '16px 28px 12px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          Indicadores do mês
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {metricas.map((m, i) => (
            <div key={i} className="esg-met" style={{
              background: `${m.cor}08`, borderRadius: 8, padding: '12px',
              border: `1px solid ${m.cor}20`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{m.icone}</span>
                <span style={{ color: '#6b7280', fontSize: 9 }}>{m.label}</span>
              </div>
              <div style={{ color: m.cor, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{m.valor}</div>
              <div style={{
                color: m.vs.startsWith('↓') ? '#16a34a' : '#16a34a',
                fontSize: 9, marginTop: 4, fontWeight: 600,
              }}>{m.vs}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Destaque iniciativa */}
      <div style={{ padding: '0 28px 14px' }}>
        <div style={{
          background: `${brandColor}0a`, border: `1px solid ${brandColor}25`,
          borderRadius: 10, padding: '14px 16px',
          borderLeft: `4px solid ${brandColor}`,
        }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 16 }}>🌱</span>
            <span style={{ color: brandColor, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Destaque ESG do mês
            </span>
          </div>
          <h3 style={{ color: '#111827', fontSize: 13, fontWeight: 800, margin: '0 0 5px' }}>
            Painéis solares instalados na sede reduziram consumo em 22%
          </h3>
          <p style={{ color: '#4b5563', fontSize: 11, margin: 0, lineHeight: 1.55 }}>
            A instalação de 120 painéis fotovoltaicos no telhado da sede já gerou economia de R$ 38 mil em dois meses de operação.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button type="button" aria-label="Ver relatório ESG completo" style={{
            flex: 1, background: brandColor, color: 'white', border: 'none',
            borderRadius: 8, padding: '10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            Ver relatório ESG completo
          </button>
          <button type="button" aria-label="Sugerir iniciativa de sustentabilidade" style={{
            flex: 1, background: 'none', color: brandColor,
            border: `1px solid ${brandColor}40`,
            borderRadius: 8, padding: '10px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
          }}>
            Sugerir iniciativa
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Sustentabilidade ESG</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
