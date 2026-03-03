'use client';

import React from 'react';

interface NewsletterTrimestralProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterTrimestral: React.FC<NewsletterTrimestralProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#1e40af',
  title = 'Relatório Trimestral',
  headline = 'Q1 2025 — Janeiro · Fevereiro · Março',
  name = 'Diretoria Executiva',
  body = 'Um trimestre de conquistas e aprendizados. Confira os resultados consolidados, o destaque por área e as principais movimentações de pessoas neste período.',
}) => {
  const financeiros = [
    { label: 'Receita Total', valor: 'R$ 12,4M', vs: '+21% vs Q1/24', cor: '#16a34a' },
    { label: 'EBITDA', valor: '24%', vs: '+2pp vs Q1/24', cor: '#3b82f6' },
    { label: 'Novos Contratos', valor: '31', vs: '+8 vs Q1/24', cor: '#8b5cf6' },
  ];

  const destaques = [
    { depto: 'Tecnologia', conquista: 'Migração cloud 100% concluída — 30 dias antes do prazo', cor: '#3b82f6' },
    { depto: 'Comercial', conquista: 'Melhor Q1 da história: 127% da meta atingida', cor: '#059669' },
    { depto: 'RH', conquista: 'eNPS de 68 pontos — maior resultado desde 2019', cor: '#8b5cf6' },
  ];

  const pessoas = [
    { label: 'Novos colaboradores', val: '23', icone: '👋' },
    { label: 'Promoções internas', val: '11', icone: '⬆️' },
    { label: 'Turnover', val: '4,2%', icone: '📊' },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ntr-fin { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .ntr-fin { animation: ntr-fin 0.35s ease both; }
        .ntr-fin:nth-child(1){animation-delay:0.05s}
        .ntr-fin:nth-child(2){animation-delay:0.12s}
        .ntr-fin:nth-child(3){animation-delay:0.19s}
        @keyframes ntr-dept { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:translateX(0)} }
        .ntr-dept { animation: ntr-dept 0.35s ease both; }
        .ntr-dept:nth-child(1){animation-delay:0.1s}
        .ntr-dept:nth-child(2){animation-delay:0.18s}
        .ntr-dept:nth-child(3){animation-delay:0.26s}
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #1e3a8a)`, padding: '24px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{brandName} · {name}</div>
          <div style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)',
            borderRadius: 6, padding: '5px 12px',
          }}>
            <span style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>Q1 2025</span>
          </div>
        </div>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, margin: 0 }}>{headline}</p>
      </div>

      {/* Intro */}
      <div style={{ padding: '16px 28px 10px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* Financeiro */}
      <div style={{ padding: '0 28px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Destaques financeiros
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {financeiros.map((f, i) => (
            <div key={i} className="ntr-fin" style={{
              background: `${f.cor}08`, border: `1px solid ${f.cor}20`,
              borderRadius: 8, padding: '10px 8px', textAlign: 'center',
            }}>
              <div style={{ color: f.cor, fontSize: 15, fontWeight: 900, lineHeight: 1 }}>{f.valor}</div>
              <div style={{ color: '#9ca3af', fontSize: 8, margin: '3px 0' }}>{f.label}</div>
              <div style={{ color: '#16a34a', fontSize: 8, fontWeight: 700 }}>{f.vs}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Destaque por departamento */}
      <div style={{ padding: '0 28px 14px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Destaque por área
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {destaques.map((d, i) => (
            <div key={i} className="ntr-dept" style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: '#f9fafb', borderRadius: 7, padding: '10px 12px',
              border: '1px solid #e5e7eb', borderLeft: `3px solid ${d.cor}`,
            }}>
              <div>
                <span style={{
                  background: `${d.cor}12`, border: `1px solid ${d.cor}25`,
                  color: d.cor, fontSize: 8, fontWeight: 700,
                  padding: '2px 7px', borderRadius: 3, display: 'inline-block', marginBottom: 3,
                }}>{d.depto}</span>
                <p style={{ color: '#374151', fontSize: 11, margin: 0, lineHeight: 1.4 }}>{d.conquista}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pessoas / RH */}
      <div style={{ padding: '0 28px 20px' }}>
        <div style={{ color: '#6b7280', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
          Pessoas & RH
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {pessoas.map((p, i) => (
            <div key={i} style={{
              flex: 1, background: '#f9fafb', borderRadius: 8, padding: '10px',
              textAlign: 'center', border: '1px solid #e5e7eb',
            }}>
              <div style={{ fontSize: 18 }}>{p.icone}</div>
              <div style={{ color: brandColor, fontSize: 16, fontWeight: 900, marginTop: 4 }}>{p.val}</div>
              <div style={{ color: '#9ca3af', fontSize: 8, lineHeight: 1.3 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Relatório Q1 2025</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
