'use client';

import React from 'react';

interface BrandbookPadraoProps {
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

export const BrandbookPadrao: React.FC<BrandbookPadraoProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Padrão Visual',
  body,
  caption,
  description,
  text,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Padrão Visual';
  const resolvedBody = body || description || caption || text || 'O padrão visual da marca pode ser utilizado como fundo, textura ou elemento decorativo em materiais impressos e digitais.';
  const initial = resolvedBrandName.charAt(0).toUpperCase();

  // Generate a 4×4 repeating pattern of the brand initial / geometric shapes
  const patternItems = Array.from({ length: 16 }, (_, i) => i);
  const shapes = ['circle', 'square', 'diamond', 'circle'];

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Padrão Visual</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.08</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>08 — Textura e Padrão</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 16px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Pattern preview — full color */}
        <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ background: brandColor, padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {patternItems.concat(patternItems).map((_, i) => {
              const shape = shapes[i % shapes.length];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {shape === 'circle' && (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
                  )}
                  {shape === 'square' && (
                    <div style={{ width: 11, height: 11, borderRadius: 2, background: 'rgba(255,255,255,0.12)', transform: 'rotate(0deg)' }} />
                  )}
                  {shape === 'diamond' && (
                    <div style={{ width: 10, height: 10, background: 'rgba(255,255,255,0.22)', transform: 'rotate(45deg)', borderRadius: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Pattern preview — light */}
        <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{ background: `${brandColor}12`, padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
            {patternItems.concat(patternItems).map((_, i) => {
              const shape = shapes[i % shapes.length];
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {shape === 'circle' && (
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: `${brandColor}30` }} />
                  )}
                  {shape === 'square' && (
                    <div style={{ width: 11, height: 11, borderRadius: 2, background: `${brandColor}22` }} />
                  )}
                  {shape === 'diamond' && (
                    <div style={{ width: 10, height: 10, background: `${brandColor}38`, transform: 'rotate(45deg)', borderRadius: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Usage contexts */}
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Papelaria', icon: '📄' },
            { label: 'Embalagem', icon: '📦' },
            { label: 'Digital', icon: '🖥️' },
            { label: 'Têxtil', icon: '👕' },
          ].map((ctx) => (
            <div key={ctx.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 6, padding: '7px 4px', textAlign: 'center' as const, border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 14 }}>{ctx.icon}</div>
              <div style={{ fontSize: 8, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{ctx.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>8</span>
      </div>
    </div>
  );
};
