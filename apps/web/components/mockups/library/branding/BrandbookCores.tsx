'use client';

import React from 'react';

interface BrandbookCoresProps {
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

export const BrandbookCores: React.FC<BrandbookCoresProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Paleta de Cores',
  body,
  caption,
  description,
  text,
  image,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Paleta de Cores';
  const resolvedBody = body || description || caption || text || 'As cores da marca garantem consistência e reconhecimento em todas as plataformas.';

  // Derive palette from brandColor
  const hex = brandColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const toHex = (v: number) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0');
  const light = `#${toHex(r + 80)}${toHex(g + 80)}${toHex(b + 80)}`;
  const dark = `#${toHex(r - 60)}${toHex(g - 60)}${toHex(b - 60)}`;

  const palette = [
    { name: 'Primária', hex: brandColor, rgb: `${r}, ${g}, ${b}`, role: 'Cor principal da marca', textColor: '#ffffff' },
    { name: 'Primária Clara', hex: light, rgb: `${Math.min(255, r + 80)}, ${Math.min(255, g + 80)}, ${Math.min(255, b + 80)}`, role: 'Destaque e hover', textColor: '#0f172a' },
    { name: 'Primária Escura', hex: dark, rgb: `${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)}`, role: 'Active e sombras', textColor: '#ffffff' },
    { name: 'Neutro 900', hex: '#0f172a', rgb: '15, 23, 42', role: 'Textos principais', textColor: '#ffffff' },
    { name: 'Neutro 400', hex: '#94a3b8', rgb: '148, 163, 184', role: 'Textos secundários', textColor: '#0f172a' },
    { name: 'Branco', hex: '#ffffff', rgb: '255, 255, 255', role: 'Fundos e espaço', textColor: '#0f172a', border: true },
  ];

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Cores</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.03</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        {/* Section label + title */}
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>03 — Identidade Cromática</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Color swatches */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
          {/* Large primary swatch */}
          <div style={{ height: 72, borderRadius: 8, background: palette[0].hex, display: 'flex', alignItems: 'flex-end', padding: '10px 14px', boxShadow: `0 4px 16px ${brandColor}44` }}>
            <div>
              <div style={{ color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '-0.01em' }}>{palette[0].name}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }}>{palette[0].hex.toUpperCase()}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontFamily: 'monospace' }}>RGB {palette[0].rgb}</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
              <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 600, textTransform: 'uppercase' as const }}>{palette[0].role}</span>
            </div>
          </div>

          {/* Light + Dark row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[palette[1], palette[2]].map((c) => (
              <div key={c.hex} style={{ height: 54, borderRadius: 8, background: c.hex, display: 'flex', alignItems: 'flex-end', padding: '8px 10px', border: c.border ? '1px solid #e2e8f0' : 'none' }}>
                <div>
                  <div style={{ color: c.textColor, fontSize: 9, fontWeight: 800 }}>{c.name}</div>
                  <span style={{ color: c.textColor, fontSize: 8, fontFamily: 'monospace', opacity: 0.7 }}>{c.hex.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Neutrals row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[palette[3], palette[4], palette[5]].map((c) => (
              <div key={c.hex} style={{ height: 46, borderRadius: 8, background: c.hex, display: 'flex', alignItems: 'flex-end', padding: '6px 8px', border: c.border ? '1px solid #e2e8f0' : 'none' }}>
                <div>
                  <div style={{ color: c.textColor, fontSize: 8, fontWeight: 800, opacity: 0.9 }}>{c.name}</div>
                  <span style={{ color: c.textColor, fontSize: 7, fontFamily: 'monospace', opacity: 0.55 }}>{c.hex.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage note */}
        <div style={{ marginTop: 14, padding: '8px 12px', background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${brandColor}` }}>
          <p style={{ fontSize: 9, color: '#475569', margin: 0, lineHeight: 1.6 }}>
            Use a cor primária como elemento de destaque. Neutros garantem legibilidade e equilíbrio visual em todos os materiais.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>3</span>
      </div>
    </div>
  );
};
