'use client';

import React from 'react';

interface BrandbookTipografiaProps {
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

export const BrandbookTipografia: React.FC<BrandbookTipografiaProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Tipografia',
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Tipografia';
  const resolvedBody = body || description || caption || text || 'O sistema tipográfico da marca utiliza fontes que expressam modernidade, clareza e profissionalismo.';

  const weights = [
    { label: 'Black 900', weight: 900, sample: 'Aa' },
    { label: 'Bold 700', weight: 700, sample: 'Aa' },
    { label: 'Medium 500', weight: 500, sample: 'Aa' },
    { label: 'Regular 400', weight: 400, sample: 'Aa' },
    { label: 'Light 300', weight: 300, sample: 'Aa' },
  ];

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Tipografia</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.04</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>04 — Sistema Tipográfico</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Primary font specimen */}
        <div style={{ background: '#f8fafc', borderRadius: 8, padding: '14px 16px', marginBottom: 12, border: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 8, color: brandColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Fonte Primária</span>
            <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600 }}>Inter / Sans-Serif</span>
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 4 }}>
            Aa
          </div>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.15em', fontWeight: 500 }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ
          </div>
          <div style={{ fontSize: 11, color: '#475569', letterSpacing: '0.1em', fontWeight: 400 }}>
            abcdefghijklmnopqrstuvwxyz
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', letterSpacing: '0.1em', marginTop: 2 }}>
            0 1 2 3 4 5 6 7 8 9 ! @ # $ %
          </div>
        </div>

        {/* Weight scale */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Escala de pesos</span>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, marginTop: 6 }}>
            {weights.map((w) => (
              <div key={w.weight} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, fontWeight: w.weight, color: '#0f172a', lineHeight: 1, width: 30 }}>{w.sample}</span>
                <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
                <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' as const }}>{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hierarchy examples */}
        <div style={{ borderLeft: `3px solid ${brandColor}`, paddingLeft: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', lineHeight: 1.2, marginBottom: 4 }}>Título Principal H1</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#334155', lineHeight: 1.3, marginBottom: 4 }}>Subtítulo / Chamada H2</div>
          <div style={{ fontSize: 10, fontWeight: 400, color: '#64748b', lineHeight: 1.6, marginBottom: 3 }}>Texto corpo — parágrafos e descrições. Tamanho ideal para leitura confortável.</div>
          <div style={{ fontSize: 8, fontWeight: 500, color: '#94a3b8', letterSpacing: '0.05em' }}>Legenda · Caption · Rótulo</div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>4</span>
      </div>
    </div>
  );
};
