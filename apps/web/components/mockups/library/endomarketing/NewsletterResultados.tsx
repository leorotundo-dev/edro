'use client';

import React from 'react';

interface NewsletterResultadosProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterResultados: React.FC<NewsletterResultadosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#059669',
  title = 'Resultados do Período',
  headline = 'Fevereiro 2025',
  name = 'Diretoria Executiva',
  body = '"Superamos nossas expectativas mais uma vez. Este resultado é reflexo do comprometimento de cada um de vocês. Sigamos juntos rumo ao nosso melhor ano." — CEO',
}) => {
  const kpis = [
    { label: 'Receita', valor: 'R$ 4,2M', vs: '+18%', hit: true, cor: '#059669' },
    { label: 'Novos Clientes', valor: '27', vs: '+12%', hit: true, cor: '#3b82f6' },
    { label: 'Churn', valor: '3,1%', vs: '-0,4pp', hit: true, cor: '#8b5cf6' },
    { label: 'NPS', valor: '78', vs: '+6pts', hit: true, cor: '#f59e0b' },
    { label: 'Ticket Médio', valor: 'R$ 155k', vs: '+5%', hit: true, cor: '#06b6d4' },
    { label: 'EBITDA', valor: '22%', vs: '-1pp', hit: false, cor: '#ef4444' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nr-kpi { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .nr-kpi { animation: nr-kpi 0.3s ease both; }
        .nr-kpi:nth-child(1){animation-delay:0.05s}
        .nr-kpi:nth-child(2){animation-delay:0.1s}
        .nr-kpi:nth-child(3){animation-delay:0.15s}
        .nr-kpi:nth-child(4){animation-delay:0.2s}
        .nr-kpi:nth-child(5){animation-delay:0.25s}
        .nr-kpi:nth-child(6){animation-delay:0.3s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #047857)`, padding: '24px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 12px',
          }}>
            <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>{headline}</span>
          </div>
        </div>
        <h1 style={{ color: 'white', fontSize: 21, fontWeight: 900, margin: 0 }}>{title}</h1>
      </div>

      {/* KPI Grid */}
      <div style={{ padding: '20px 28px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
          Destaques do período
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {kpis.map((k, i) => (
            <div key={i} className="nr-kpi" style={{
              background: `${k.cor}08`, borderRadius: 8, padding: '12px 10px',
              border: `1px solid ${k.cor}20`, textAlign: 'center',
            }}>
              <div style={{ color: k.cor, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{k.valor}</div>
              <div style={{ color: '#9ca3af', fontSize: 9, margin: '3px 0' }}>{k.label}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                background: k.hit ? '#dcfce7' : '#fee2e2',
                border: `1px solid ${k.hit ? '#86efac' : '#fca5a5'}`,
                borderRadius: 10, padding: '2px 7px',
              }}>
                <span style={{ color: k.hit ? '#16a34a' : '#dc2626', fontSize: 9, fontWeight: 700 }}>
                  {k.hit ? '↑' : '↓'} {k.vs}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ color: '#9ca3af', fontSize: 9, marginTop: 6, textAlign: 'right' }}>
          vs. mesmo período do mês anterior
        </div>
      </div>

      {/* CEO Quote */}
      <div style={{ padding: '0 28px 20px' }}>
        <div style={{
          background: `${brandColor}08`, border: `1px solid ${brandColor}20`,
          borderLeft: `4px solid ${brandColor}`, borderRadius: '0 8px 8px 0',
          padding: '14px 16px',
        }}>
          <p style={{ color: '#374151', fontSize: 12, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>
            {body}
          </p>
        </div>
      </div>

      {/* Próximos passos */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Próximos passos
        </div>
        {[
          'Revisão orçamentária Q2 — 15/03',
          'Apresentação de resultados ao Conselho — 20/03',
          'Planejamento estratégico H2 — início em abril',
        ].map((p, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0',
            borderBottom: i < 2 ? '1px solid #f3f4f6' : 'none',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: brandColor, flexShrink: 0,
            }} />
            <span style={{ color: '#374151', fontSize: 11 }}>{p}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Comunicação Executiva</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
