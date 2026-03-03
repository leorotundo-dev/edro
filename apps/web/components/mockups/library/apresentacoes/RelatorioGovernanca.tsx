'use client';

import React from 'react';

interface RelatorioGovernancaProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioGovernanca: React.FC<RelatorioGovernancaProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Governança Corporativa';

  const boardMembers = [
    { name: 'Carlos Mendes', role: 'Presidente do Conselho', independent: true },
    { name: 'Ana Lima', role: 'Conselheira Independente', independent: true },
    { name: 'Roberto Silva', role: 'Conselheiro Independente', independent: true },
    { name: 'Patricia Souza', role: 'Conselheira', independent: false },
    { name: 'Marcos Oliveira', role: 'Conselheiro', independent: false },
  ];

  const committees = [
    {
      name: 'Comitê de Auditoria',
      members: 3,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      ),
    },
    {
      name: 'Comitê de Remuneração',
      members: 3,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      name: 'Comitê de ESG',
      members: 4,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
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
      {/* Top bar */}
      <div style={{ height: '5px', background: accent, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
      </div>

      {/* Board members */}
      <div style={{ padding: '14px 28px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Conselho de Administração
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {boardMembers.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: `1px solid ${accent}11`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: `${accent}14`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: accent,
                    flexShrink: 0,
                  }}
                >
                  {m.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#111827' }}>{m.name}</div>
                  <div style={{ fontSize: '9px', color: '#6b7280' }}>{m.role}</div>
                </div>
              </div>
              {m.independent && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '20px',
                    padding: '1px 7px',
                    fontSize: '8px',
                    fontWeight: 700,
                    color: '#16a34a',
                    flexShrink: 0,
                  }}
                >
                  Independente
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Committees */}
      <div style={{ padding: '0 28px', flex: 1 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Estrutura de Comitês
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {committees.map((c, i) => (
            <div
              key={i}
              style={{
                background: `${accent}08`,
                border: `1px solid ${accent}22`,
                borderRadius: '8px',
                padding: '12px 10px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: accent, display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{c.icon}</div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#111827', lineHeight: 1.3, marginBottom: '4px' }}>
                {c.name}
              </div>
              <div style={{ fontSize: '9px', color: '#6b7280' }}>{c.members} membros</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <div style={{ padding: '12px 28px 16px', flexShrink: 0 }}>
        <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          Composição aprovada na AGO 2024. Mandatos de 2 anos, renováveis.
        </p>
      </div>

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
        Governança
      </div>
    </div>
  );
};
