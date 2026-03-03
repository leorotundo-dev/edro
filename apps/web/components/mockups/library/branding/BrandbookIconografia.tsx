'use client';

import React from 'react';

interface BrandbookIconografiaProps {
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

export const BrandbookIconografia: React.FC<BrandbookIconografiaProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Iconografia',
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Iconografia';
  const resolvedBody = body || description || caption || text || 'Conjunto de ícones que compõe o sistema visual da marca, com estilo consistente e reconhecível.';

  const icons = [
    { label: 'Casa', path: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
    { label: 'Usuário', path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { label: 'Gráfico', path: 'M18 20V10 M12 20V4 M6 20v-6' },
    { label: 'Estrela', path: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { label: 'Sinal', path: 'M22 12h-4l-3 9L9 3l-3 9H2' },
    { label: 'Cadeado', path: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4' },
    { label: 'Foguete', path: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' },
    { label: 'Olho', path: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0' },
    { label: 'Livro', path: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
  ];

  const tints = [
    `${brandColor}18`,
    `${brandColor}28`,
    `${brandColor}18`,
    `${brandColor}28`,
    `${brandColor}18`,
    `${brandColor}28`,
    `${brandColor}18`,
    `${brandColor}28`,
    `${brandColor}18`,
  ];

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Iconografia</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.07</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>07 — Sistema de Ícones</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Icon grid 3×3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {icons.slice(0, 9).map((icon, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 6 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: tints[i], display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${brandColor}22` }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {icon.path.split(' M').map((segment, j) => (
                    <path key={j} d={j === 0 ? segment : 'M' + segment} />
                  ))}
                </svg>
              </div>
              <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600, textAlign: 'center' as const }}>{icon.label}</span>
            </div>
          ))}
        </div>

        {/* Style spec */}
        <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
          {[
            { label: 'Estilo', value: 'Outline' },
            { label: 'Peso do traço', value: '1.75px' },
            { label: 'Tamanho base', value: '24×24' },
            { label: 'Corner', value: 'Round' },
          ].map((item) => (
            <div key={item.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 5, padding: '6px 5px', textAlign: 'center' as const, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#0f172a' }}>{item.value}</div>
              <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 1 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>7</span>
      </div>
    </div>
  );
};
