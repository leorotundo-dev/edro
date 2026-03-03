'use client';

import React from 'react';

interface PoliticaDiversidadeProps {
  brandName?: string;
  brandColor?: string;
  name?: string;
  title?: string;
  headline?: string;
  body?: string;
  image?: string;
}

export const PoliticaDiversidade: React.FC<PoliticaDiversidadeProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#7c3aed',
  name = 'Diversidade & Inclusão',
  title = 'Política de Diversidade e Inclusão',
  headline = 'Programa D&I 2025 — Metas e Iniciativas',
  body = 'Acreditamos que ambientes diversos e inclusivos geram melhores resultados. Esta política estabelece nossas metas, iniciativas e compromissos para criar um espaço de trabalho verdadeiramente representativo.',
  image = '',
}) => {
  const pilares = [
    { label: 'Gênero', atual: 42, meta: 50, cor: '#ec4899', icone: '⚧' },
    { label: 'Raça', atual: 31, meta: 45, cor: '#f59e0b', icone: '✊' },
    { label: 'LGBTQIA+', atual: 18, meta: 25, cor: '#6366f1', icone: '🏳️‍🌈' },
    { label: 'PcD', atual: 5, meta: 10, cor: '#10b981', icone: '♿' },
  ];

  const iniciativas = [
    'Grupos de afinidade ativos em todas as unidades',
    'Treinamentos obrigatórios de viés inconsciente',
    'Revisão cega de currículos no processo seletivo',
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
        @keyframes pd-bar { from{width:0} to{width:var(--w)} }
        .pd-bar-fill { animation: pd-bar 0.8s ease both; }
        @keyframes pd-card { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        .pd-card { animation: pd-card 0.35s ease both; }
        .pd-card:nth-child(1){animation-delay:0.05s}
        .pd-card:nth-child(2){animation-delay:0.12s}
        .pd-card:nth-child(3){animation-delay:0.19s}
        .pd-card:nth-child(4){animation-delay:0.26s}
      `}</style>

      {/* Header multicolor */}
      <div style={{ height: 6, background: 'linear-gradient(90deg, #ec4899, #f59e0b, #6366f1, #10b981)' }} />
      <div style={{
        background: `linear-gradient(135deg, ${brandColor} 0%, #4c1d95 100%)`,
        padding: '20px 26px 16px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {image ? (
              <img src={image} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            )}
          </div>
          <div>
            <h1 style={{ color: 'white', fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 }}>{title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, margin: 0 }}>{brandName} · {name}</p>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, margin: 0 }}>{headline}</p>
      </div>

      {/* Intro */}
      <div style={{ padding: '14px 24px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Pilares / Metas */}
      <div style={{ padding: '0 24px 12px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          Representatividade — Atual vs. Meta 2025
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {pilares.map((p, i) => (
            <div key={i} className="pd-card" style={{
              background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
              border: `1px solid ${p.cor}25`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 16 }}>{p.icone}</span>
                <span style={{ color: '#111827', fontSize: 11, fontWeight: 700 }}>{p.label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: p.cor, fontSize: 12, fontWeight: 800 }}>{p.atual}%</span>
                <span style={{ color: '#9ca3af', fontSize: 10 }}>Meta: {p.meta}%</span>
              </div>
              {/* Barra atual */}
              <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${p.atual}%`,
                  background: p.cor, borderRadius: 3,
                }} />
              </div>
              {/* Barra meta */}
              <div style={{ height: 3, background: '#e5e7eb', borderRadius: 2, marginTop: 3, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%', width: `${p.meta}%`,
                  background: `${p.cor}50`, borderRadius: 2,
                }} />
              </div>
              <div style={{ color: '#9ca3af', fontSize: 8, marginTop: 4 }}>
                {p.meta - p.atual > 0 ? `+${p.meta - p.atual}pp até a meta` : 'Meta atingida!'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Iniciativas */}
      <div style={{ padding: '0 24px 20px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Iniciativas em andamento
        </div>
        {iniciativas.map((ini, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '6px 0', borderBottom: i < iniciativas.length - 1 ? '1px solid #f3f4f6' : 'none',
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
              background: `${brandColor}15`, border: `1px solid ${brandColor}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span style={{ color: '#374151', fontSize: 11, lineHeight: 1.4 }}>{ini}</span>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{
        background: '#f9fafb', borderTop: '1px solid #e5e7eb',
        padding: '10px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{brandName} · POL-DI-001 · 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
