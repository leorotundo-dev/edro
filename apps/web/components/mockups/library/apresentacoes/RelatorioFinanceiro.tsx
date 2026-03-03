'use client';

import React from 'react';

interface RelatorioFinanceiroProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioFinanceiro: React.FC<RelatorioFinanceiroProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Demonstrações Financeiras';

  // P&L rows: label, 2023, 2024, change
  const rows: { label: string; v2023: string; v2024: string; change: string; up: boolean; bold?: boolean; indent?: boolean }[] = [
    { label: 'Receita Bruta', v2023: '823,4', v2024: '965,1', change: '+17,2%', up: true },
    { label: '(-) Deduções', v2023: '(100,3)', v2024: '(118,1)', change: '-17,7%', up: false, indent: true },
    { label: 'Receita Líquida', v2023: '723,1', v2024: '847,0', change: '+17,1%', up: true, bold: true },
    { label: '(-) Despesas Operacionais', v2023: '(545,1)', v2024: '(633,0)', change: '-16,1%', up: false, indent: true },
    { label: 'EBITDA', v2023: '178,0', v2024: '214,0', change: '+20,2%', up: true, bold: true },
    { label: '(-) D&A', v2023: '(32,1)', v2024: '(35,4)', change: '-10,3%', up: false, indent: true },
    { label: 'Lucro Líquido', v2023: '98,4', v2024: '122,6', change: '+24,6%', up: true, bold: true },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '420px',
        height: '594px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: '5px', background: accent, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: `2px solid ${accent}22`, flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
        <p style={{ fontSize: '10px', color: '#9ca3af', margin: '3px 0 0', fontStyle: 'italic' }}>
          Valores em R$ milhões — Exercícios 2023 e 2024
        </p>
      </div>

      {/* Table */}
      <div style={{ flex: 1, padding: '16px 28px' }}>
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 90px 70px',
            gap: '4px',
            padding: '6px 8px',
            background: accent,
            borderRadius: '6px',
            marginBottom: '4px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>Item</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>2023</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', textAlign: 'right' }}>2024</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', textAlign: 'right' }}>Var.</div>
        </div>

        {/* Table rows */}
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 90px 70px',
              gap: '4px',
              padding: '7px 8px',
              background: row.bold ? `${accent}08` : 'transparent',
              borderRadius: row.bold ? '4px' : 0,
              borderBottom: !row.bold ? '1px solid #f5f5f5' : `1px solid ${accent}22`,
              marginBottom: row.bold ? '4px' : 0,
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: row.bold ? 700 : 400,
                color: row.bold ? '#111827' : '#374151',
                paddingLeft: row.indent ? '12px' : 0,
              }}
            >
              {row.label}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', textAlign: 'right' }}>{row.v2023}</div>
            <div style={{ fontSize: '11px', fontWeight: row.bold ? 700 : 400, color: '#111827', textAlign: 'right' }}>{row.v2024}</div>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: row.up ? '#16a34a' : '#dc2626',
                textAlign: 'right',
              }}
            >
              {row.change}
            </div>
          </div>
        ))}
      </div>

      {/* Note */}
      <div style={{ padding: '0 28px 20px', flexShrink: 0 }}>
        <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          * Valores sujeitos a ajustes de auditoria. Demonstrações completas disponíveis em relatório integral.
        </p>
      </div>

      {/* Bottom strip */}
      <div style={{ height: '4px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`, flexShrink: 0 }} />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Financeiro
      </div>
    </div>
  );
};
