'use client';

import React from 'react';

interface BrandbookAplicacoesProps {
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

export const BrandbookAplicacoes: React.FC<BrandbookAplicacoesProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Aplicações do Logo',
  body,
  caption,
  description,
  text,
  image,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTitle = title || headline || 'Aplicações do Logo';
  const resolvedBody = body || description || caption || text || 'Exemplos de uso da marca em diferentes fundos e contextos.';
  const resolvedLogo = image || profileImage;

  const initial = resolvedBrandName.charAt(0).toUpperCase();

  const LogoMark = ({ bg, textColor, border }: { bg: string; textColor: string; border?: string }) => (
    <div style={{ background: bg, border: border || 'none', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 12px', gap: 6 }}>
      {resolvedLogo ? (
        <img src={resolvedLogo} alt={resolvedBrandName} style={{ width: 40, height: 40, objectFit: 'contain', filter: textColor === '#ffffff' ? 'brightness(0) invert(1)' : 'none' }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 8, background: textColor === '#ffffff' ? 'rgba(255,255,255,0.25)' : `${brandColor}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: textColor, fontSize: 18, fontWeight: 900 }}>{initial}</span>
        </div>
      )}
      <span style={{ color: textColor, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, opacity: 0.85 }}>
        {resolvedBrandName}
      </span>
    </div>
  );

  return (
    <div style={{ width: 420, fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
      {/* Header strip */}
      <div style={{ background: brandColor, padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Brandbook — Aplicações</span>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 500 }}>A4 · p.06</span>
      </div>

      <div style={{ padding: '24px 24px 20px' }}>
        {/* Section heading */}
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: brandColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>06 —</span>
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{resolvedTitle}</h2>
        <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 20px', lineHeight: 1.6 }}>{resolvedBody}</p>

        {/* Applications grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
          {/* Fundo branco */}
          <div>
            <LogoMark bg="#ffffff" textColor="#0f172a" border={`1px solid #e2e8f0`} />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Fundo branco</p>
          </div>
          {/* Fundo colorido */}
          <div>
            <LogoMark bg={brandColor} textColor="#ffffff" />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Fundo colorido</p>
          </div>
          {/* Fundo escuro */}
          <div>
            <LogoMark bg="#0f172a" textColor="#ffffff" />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Fundo escuro</p>
          </div>
          {/* Fundo claro */}
          <div>
            <LogoMark bg="#f8fafc" textColor="#0f172a" border="1px solid #f1f5f9" />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Fundo cinza</p>
          </div>
          {/* Fundo foto */}
          <div>
            <LogoMark bg={`${brandColor}33`} textColor={brandColor} />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Fundo tonal</p>
          </div>
          {/* Negativo */}
          <div>
            <LogoMark bg="#1e293b" textColor="#ffffff" />
            <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' as const, margin: '6px 0 0', fontWeight: 600 }}>Negativo</p>
          </div>
        </div>

        {/* Note box */}
        <div style={{ background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <p style={{ fontSize: 10, color: '#92400e', margin: 0, lineHeight: 1.5 }}>
            Sempre mantenha o contraste mínimo de <strong>4.5:1</strong> entre o logo e o fundo. Nunca aplique o logo colorido sobre fundos que reduzam legibilidade.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fafafa' }}>
        <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.05em' }}>{resolvedBrandName.toUpperCase()} · MANUAL DE IDENTIDADE VISUAL</span>
        <span style={{ fontSize: 9, color: '#cbd5e1' }}>6</span>
      </div>
    </div>
  );
};
