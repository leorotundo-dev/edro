'use client';

import React from 'react';

interface TVCorporativaCardapioProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaCardapio: React.FC<TVCorporativaCardapioProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Cardápio do Refeitório',
  headline = 'Terça-feira, 04 de Março',
  brandColor = '#16a34a',
  name = '',
}) => {
  const menu = [
    {
      categoria: 'Prato Principal',
      cor: '#16a34a',
      icon: '🍽️',
      itens: ['Frango Grelhado com Ervas', 'Filé de Tilápia ao Limão'],
      cal: '420 kcal',
    },
    {
      categoria: 'Guarnições',
      cor: '#ca8a04',
      icon: '🥗',
      itens: ['Arroz Integral', 'Feijão Carioca', 'Macarrão ao Alho e Óleo'],
      cal: '280 kcal',
    },
    {
      categoria: 'Saladas',
      cor: '#0891b2',
      icon: '🥬',
      itens: ['Mix de Folhas Verdes', 'Tomate Cereja com Manjericão'],
      cal: '60 kcal',
    },
    {
      categoria: 'Sobremesa',
      cor: '#be185d',
      icon: '🍮',
      itens: ['Pudim de Leite Condensado', 'Fruta da Época'],
      cal: '180 kcal',
    },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(160deg, #030f06 0%, #0a1f0d 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes card-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .card-col { animation: card-in 0.4s ease both; }
        .card-col:nth-child(1){animation-delay:0.05s}
        .card-col:nth-child(2){animation-delay:0.15s}
        .card-col:nth-child(3){animation-delay:0.25s}
        .card-col:nth-child(4){animation-delay:0.35s}
        @keyframes steam { 0%,100%{transform:translateY(0) scaleX(1);opacity:0.6} 50%{transform:translateY(-4px) scaleX(1.3);opacity:0.3} }
        .steam { animation: steam 2s ease-in-out infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, #16a34a, #84cc16, #ca8a04)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 8px', borderBottom: '1px solid rgba(22,163,74,0.25)',
        background: 'rgba(22,163,74,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 24 }}>👨‍🍳</div>
          <div>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 15 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{brandName}</div>
          </div>
        </div>
        <div style={{
          background: 'rgba(22,163,74,0.2)', border: '1px solid rgba(22,163,74,0.4)',
          borderRadius: 20, padding: '4px 14px',
        }}>
          <span style={{ color: '#4ade80', fontSize: 11, fontWeight: 700 }}>{headline}</span>
        </div>
      </div>

      {/* Horário */}
      <div style={{
        display: 'flex', gap: 16, padding: '6px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        {['Almoço: 11h30 – 13h30', 'Jantar: 18h00 – 20h00'].map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9 }}>{t}</span>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>Consulte alergênicos no balcão</span>
        </div>
      </div>

      {/* Menu grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px' }}>
        {menu.map((cat, i) => (
          <div key={i} className="card-col" style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 8px',
            borderTop: `3px solid ${cat.cor}`, display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 14 }}>{cat.icon}</span>
              <span style={{ color: cat.cor, fontSize: 9, fontWeight: 700, lineHeight: 1.2 }}>{cat.categoria}</span>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {cat.itens.map((item, j) => (
                <div key={j} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                  <div style={{ width: 3, height: 3, borderRadius: '50%', background: cat.cor, marginTop: 4, flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, lineHeight: 1.3 }}>{item}</span>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 3, marginTop: 'auto',
              background: `${cat.cor}15`, borderRadius: 4, padding: '2px 6px',
            }}>
              <span style={{ color: cat.cor, fontSize: 8, fontWeight: 600 }}>~{cat.cal}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '5px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Cardápio sujeito a alterações</span>
        <span style={{ color: '#4ade80', fontSize: 9, fontWeight: 600 }}>Bom apetite! 🌿</span>
      </div>
    </div>
  );
};
