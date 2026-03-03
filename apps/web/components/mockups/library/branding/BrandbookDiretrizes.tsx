'use client';

import React from 'react';

interface BrandbookDiretrizesProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  profileImage?: string;
  brandColor?: string;
}

export const BrandbookDiretrizes: React.FC<BrandbookDiretrizesProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Diretrizes de Uso',
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Diretrizes de Uso';
  const resolvedBody = body || description || caption || text || 'Siga estas diretrizes para garantir a integridade visual da marca em todas as aplicações.';

  const doItems = [
    'Usar o logo com área de proteção respeitada',
    'Aplicar em fundos com contraste adequado',
    'Manter proporções originais sempre',
    'Usar apenas as cores aprovadas da paleta',
  ];

  const dontItems = [
    'Distorcer ou esticar o logo',
    'Aplicar em fundos que reduzam legibilidade',
    'Adicionar efeitos, sombras ou bordas',
    'Alterar as cores ou tipografia da marca',
  ];

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Diretrizes</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.05</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>05 — Regras de Aplicação</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Do / Don't columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* DO column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a', letterSpacing: '-0.01em' }}>Correto</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {doItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <span style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DON'T column */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', letterSpacing: '-0.01em' }}>Incorreto</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
              {dontItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </div>
                  <span style={{ fontSize: 9, color: '#374151', lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '16px 0' }} />

        {/* Quick reference */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Área mínima', value: '20px' },
            { label: 'Proporção', value: 'Original' },
            { label: 'Fundos', value: 'Aprovados' },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '8px 8px 6px', textAlign: 'center' as const, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#0f172a' }}>{item.value}</div>
              <div style={{ fontSize: 8, color: '#94a3b8', marginTop: 2, fontWeight: 500 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>5</span>
      </div>
    </div>
  );
};
