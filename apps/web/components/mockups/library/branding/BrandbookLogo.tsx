'use client';

import React from 'react';

interface BrandbookLogoProps {
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

export const BrandbookLogo: React.FC<BrandbookLogoProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Construção do Logo',
  body,
  caption,
  description,
  text,
  image,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Construção do Logo';
  const resolvedBody = body || description || caption || text || 'A malha de construção define as proporções, espaçamentos e área de proteção do logotipo.';
  const resolvedLogo = image || profileImage;
  const initial = resolvedBrandName.charAt(0).toUpperCase();

  return (
    <div style={{ width: 297, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Logo</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.02</span>
      </div>

      <div style={{ padding: '22px 20px 18px' }}>
        <div style={{ marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: brandColor, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>02 — Malha Construtiva</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', margin: '0 0 5px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 10, color: '#64748b', margin: '0 0 18px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Grid canvas */}
        <div style={{ position: 'relative', height: 160, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${brandColor}18 1px, transparent 1px), linear-gradient(90deg, ${brandColor}18 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

          {/* Exclusion zone dashed border */}
          <div style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 20, border: `1.5px dashed ${brandColor}55`, borderRadius: 4 }} />

          {/* X markers at corners of exclusion zone */}
          {[
            { top: 16, left: 16 },
            { top: 16, right: 16 },
            { bottom: 16, left: 16 },
            { bottom: 16, right: 16 },
          ].map((pos, i) => (
            <div key={i} style={{ position: 'absolute', ...pos, width: 8, height: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="8" height="8" viewBox="0 0 8 8"><line x1="0" y1="0" x2="8" y2="8" stroke={brandColor} strokeWidth="1.2"/><line x1="8" y1="0" x2="0" y2="8" stroke={brandColor} strokeWidth="1.2"/></svg>
            </div>
          ))}

          {/* Logo centered */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' as const, gap: 6 }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedBrandName} style={{ height: 48, objectFit: 'contain' }} />
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#fff', fontSize: 20, fontWeight: 900 }}>{initial}</span>
                </div>
                <span style={{ color: '#0f172a', fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>{resolvedBrandName}</span>
              </>
            )}
          </div>

          {/* Dimension arrows */}
          <div style={{ position: 'absolute', bottom: 6, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 3 }}>
            <div style={{ width: 50, height: 1, background: brandColor, opacity: 0.5 }} />
            <span style={{ fontSize: 7, color: brandColor, fontWeight: 700, whiteSpace: 'nowrap' as const }}>x — Unidade</span>
            <div style={{ width: 50, height: 1, background: brandColor, opacity: 0.5 }} />
          </div>
        </div>

        {/* Specs row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 14 }}>
          {[
            { label: 'Área de proteção', value: '1x', desc: 'Espaçamento mínimo' },
            { label: 'Tamanho mínimo', value: '40px', desc: 'Versão digital' },
            { label: 'Proporção', value: 'Livre', desc: 'Mantida sempre' },
          ].map((item) => (
            <div key={item.label} style={{ background: '#f8fafc', borderRadius: 6, padding: '8px 8px 6px', border: '1px solid #f1f5f9' }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: brandColor, letterSpacing: '-0.01em' }}>{item.value}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#0f172a', marginTop: 1 }}>{item.label}</div>
              <div style={{ fontSize: 7, color: '#94a3b8', marginTop: 1 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '7px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 8, color: '#cbd5e1' }}>2</span>
      </div>
    </div>
  );
};
