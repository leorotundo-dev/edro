'use client';

import React from 'react';

interface NewsletterCampanhaProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
  description?: string;
}

export const NewsletterCampanha: React.FC<NewsletterCampanhaProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#f59e0b',
  title = 'Campanha de Vendas — Q1 2025',
  headline = 'Bora bater a meta!',
  name = 'Comercial',
  body = 'Faltam apenas 12 dias para encerrar o trimestre. Cada venda conta! Confira o ranking e os prêmios que estão em jogo.',
  description = '',
}) => {
  const top5 = [
    { pos: 1, nome: 'Fernanda Lima', vendas: 47, meta: 40, cor: '#f59e0b' },
    { pos: 2, nome: 'Ricardo Souza', vendas: 43, meta: 40, cor: '#9ca3af' },
    { pos: 3, nome: 'Juliana Costa', vendas: 41, meta: 40, cor: '#b45309' },
    { pos: 4, nome: 'Marcos Alves', vendas: 38, meta: 40, cor: '#6b7280' },
    { pos: 5, nome: 'Patricia Melo', vendas: 35, meta: 40, cor: '#6b7280' },
  ];

  const metaGeral = 320;
  const realizado = 284;
  const pct = Math.round((realizado / metaGeral) * 100);

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nc-therm { from{width:0} to{width:${pct}%} }
        .nc-therm-fill { animation: nc-therm 1.2s ease both 0.3s; }
        @keyframes nc-row { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .nc-row { animation: nc-row 0.35s ease both; }
        .nc-row:nth-child(1){animation-delay:0.05s}
        .nc-row:nth-child(2){animation-delay:0.12s}
        .nc-row:nth-child(3){animation-delay:0.19s}
        .nc-row:nth-child(4){animation-delay:0.26s}
        .nc-row:nth-child(5){animation-delay:0.33s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #d97706)`, padding: '26px 28px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11 }}>{brandName} · {name}</div>
          </div>
          <div style={{ fontSize: 30 }}>🏆</div>
        </div>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '0 0 4px', lineHeight: 1.2 }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 }}>{headline}</p>
      </div>

      {/* Termômetro de meta */}
      <div style={{ padding: '20px 28px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ color: '#374151', fontSize: 12, fontWeight: 700 }}>Meta do time</span>
          <span style={{ color: brandColor, fontSize: 14, fontWeight: 900 }}>{pct}%</span>
        </div>
        {/* Termômetro */}
        <div style={{ height: 18, background: '#f3f4f6', borderRadius: 20, overflow: 'hidden', position: 'relative' }}>
          <div className="nc-therm-fill" style={{
            height: '100%', background: `linear-gradient(90deg, ${brandColor}, #fbbf24)`,
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            paddingRight: 8, width: `${pct}%`,
          }}>
            <span style={{ color: 'white', fontSize: 9, fontWeight: 800 }}>{realizado}/{metaGeral}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#9ca3af', fontSize: 9 }}>0</span>
          <span style={{ color: '#9ca3af', fontSize: 9 }}>Meta: {metaGeral} vendas</span>
        </div>
      </div>

      {/* Corpo */}
      <div style={{ padding: '0 28px 12px' }}>
        <p style={{ color: '#4b5563', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{body}</p>
      </div>

      {/* Ranking */}
      <div style={{ padding: '0 28px 18px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Top 5 — Ranking da Campanha
        </div>
        {top5.map((v, i) => (
          <div key={i} className="nc-row" style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 8, marginBottom: 5,
            background: i === 0 ? '#fef9c3' : '#f9fafb',
            border: i === 0 ? '1px solid #fde68a' : '1px solid #e5e7eb',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: v.cor, color: 'white',
              fontSize: 10, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              {v.pos === 1 ? '🥇' : v.pos === 2 ? '🥈' : v.pos === 3 ? '🥉' : v.pos}
            </div>
            <span style={{ flex: 1, color: '#111827', fontSize: 12, fontWeight: v.pos <= 3 ? 700 : 400 }}>{v.nome}</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: v.vendas >= v.meta ? '#16a34a' : '#6b7280', fontSize: 12, fontWeight: 800 }}>{v.vendas}</div>
              <div style={{ color: '#9ca3af', fontSize: 8 }}>meta {v.meta}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Prêmio */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          background: `${brandColor}10`, border: `1px solid ${brandColor}30`,
          borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center',
        }}>
          <div style={{ fontSize: 28 }}>🎁</div>
          <div>
            <div style={{ color: '#92400e', fontSize: 12, fontWeight: 800, marginBottom: 2 }}>Premiação</div>
            <div style={{ color: '#78350f', fontSize: 11, lineHeight: 1.4 }}>
              1º lugar: R$ 3.000 em prêmios · 2º: R$ 1.500 · 3º: R$ 800
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comercial</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
