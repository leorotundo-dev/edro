'use client';

import React from 'react';

interface TVCorporativaKPIsProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaKPIs: React.FC<TVCorporativaKPIsProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Painel de Indicadores',
  headline = '2º Trimestre 2025',
  brandColor = '#2563eb',
  name = '',
}) => {
  const kpis = [
    { label: 'Receita', value: 'R$ 4,2M', sub: '+12% vs meta', trend: 'up', color: '#22c55e' },
    { label: 'Unidades Vendidas', value: '18.340', sub: '+8% vs mês ant.', trend: 'up', color: '#22c55e' },
    { label: 'NPS', value: '72', sub: '-3 pts vs trimestre', trend: 'down', color: '#ef4444' },
    { label: 'Presença', value: '94,5%', sub: '+1,2% vs meta', trend: 'up', color: '#22c55e' },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      position: 'relative', display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes kpi-slide-in { from{transform:translateY(16px);opacity:0} to{transform:translateY(0);opacity:1} }
        .kpi-card { animation: kpi-slide-in 0.5s ease both; }
        .kpi-card:nth-child(1){animation-delay:0.1s}
        .kpi-card:nth-child(2){animation-delay:0.2s}
        .kpi-card:nth-child(3){animation-delay:0.3s}
        .kpi-card:nth-child(4){animation-delay:0.4s}
        .kpi-live { animation: kpi-pulse 2s infinite; }
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #7c3aed, #06b6d4)` }} />

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px 6px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: brandColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{brandName}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)',
            borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <div className="kpi-live" style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ color: '#22c55e', fontSize: 10, fontWeight: 600 }}>AO VIVO</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{headline}</div>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, padding: '12px 18px',
      }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card" style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10, padding: '12px 10px', display: 'flex', flexDirection: 'column',
            justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: kpi.color, borderRadius: '10px 10px 0 0',
            }} />
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase' }}>
              {kpi.label}
            </div>
            <div style={{ color: 'white', fontSize: 26, fontWeight: 800, lineHeight: 1, margin: '8px 0 5px' }}>
              {kpi.value}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {kpi.trend === 'up'
                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              }
              <span style={{ color: kpi.color, fontSize: 9, fontWeight: 600 }}>{kpi.sub}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: '5px 18px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: 'Meta Geral', val: '87%', bar: 87, color: brandColor },
            { label: 'Equipes Ativas', val: '12/14', bar: 85, color: '#7c3aed' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>{item.label}</span>
              <div style={{ width: 56, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${item.bar}%`, height: '100%', background: item.color, borderRadius: 2 }} />
              </div>
              <span style={{ color: 'white', fontSize: 9, fontWeight: 700 }}>{item.val}</span>
            </div>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
};
