'use client';

import React from 'react';

interface TVTeleshoppingProps {
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
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const TVTeleshopping: React.FC<TVTeleshoppingProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor = '#F97316',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Ligue agora e aproveite essa oferta exclusiva!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Apresentação completa do produto com demonstração ao vivo, depoimentos e oferta especial por tempo limitado.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#F97316';

  const products = [
    { name: 'Kit Básico', oldPrice: 'R$ 199', newPrice: 'R$ 79', badge: '' },
    { name: 'Kit Premium', oldPrice: 'R$ 399', newPrice: 'R$ 149', badge: 'MAIS VENDIDO' },
    { name: 'Kit Família', oldPrice: 'R$ 599', newPrice: 'R$ 219', badge: 'OFERTA' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0800', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <style>{`
        @keyframes ts-ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        .ts-ticker { animation: ts-ticker 10s linear infinite; }
        @keyframes ts-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .ts-pulse { animation: ts-pulse 0.7s ease-in-out infinite; }
        @keyframes ts-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        .ts-blink { animation: ts-blink 0.5s step-end infinite; }
        @keyframes ts-shake { 0%,100%{transform:rotate(0)} 20%{transform:rotate(-2deg)} 60%{transform:rotate(2deg)} }
        .ts-shake { animation: ts-shake 0.5s ease-in-out infinite; }
      `}</style>

      {/* Header — teleshopping orange bar */}
      <div style={{ background: accent, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: '#000', borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={accent}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.92z"/></svg>
          <span style={{ color: accent, fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>TELESHOP</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#000', fontSize: 12, fontWeight: 700 }}>Programa de Telecompras</div>
          <div style={{ color: 'rgba(0,0,0,0.6)', fontSize: 10 }}>Infomercial • 120s</div>
        </div>
        <div className="ts-blink" style={{ background: '#ef4444', borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>AO VIVO</span>
        </div>
      </div>

      {/* Scrolling ticker */}
      <div style={{ background: '#000', overflow: 'hidden', height: 22, display: 'flex', alignItems: 'center' }}>
        <span className="ts-ticker" style={{ color: accent, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', paddingLeft: '100%' }}>
          ★ LIGUE AGORA: 0800 000 0000 ★ FRETE GRÁTIS ★ PARCELAMOS EM 12X SEM JUROS ★ ESTOQUE LIMITADO ★ GARANTIA 30 DIAS ★
        </span>
      </div>

      {/* Hero product + LIGUE AGORA CTA */}
      <div style={{ background: '#1a0a00', padding: '14px 16px 10px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 60% 50%, ${accent}15, transparent 70%)` }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
          {/* Product visual */}
          <div style={{ flexShrink: 0 }}>
            {img
              ? <img src={img} alt={brand} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: `2px solid ${accent}60` }} />
              : <div style={{ width: 90, height: 90, background: '#2a1500', borderRadius: 8, border: `2px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={`${accent}70`} strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
            }
          </div>
          {/* Price callout */}
          <div style={{ flex: 1 }}>
            <div style={{ color: accent, fontSize: 13, fontWeight: 800, marginBottom: 2 }}>{brand}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{ color: '#666', fontSize: 12, textDecoration: 'line-through' }}>R$ 399,90</span>
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 900 }}>R$ 149,90</span>
            </div>
            <div style={{ color: '#aaa', fontSize: 9 }}>ou 12x de R$ 12,49 • sem juros</div>
            {/* LIGUE AGORA button */}
            <div className="ts-shake" style={{ marginTop: 8, background: '#ef4444', borderRadius: 6, padding: '6px 12px', display: 'inline-block' }}>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 900, letterSpacing: 1 }}>LIGUE AGORA!</span>
            </div>
          </div>
        </div>

        {/* Phone number */}
        <div style={{ marginTop: 10, background: '#000', borderRadius: 6, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={accent}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.92z"/></svg>
          <div className="ts-pulse" style={{ color: accent, fontSize: 20, fontWeight: 900, letterSpacing: 2 }}>0800 000 0000</div>
          <span style={{ color: '#666', fontSize: 9, marginLeft: 'auto' }}>Gratuito</span>
        </div>
      </div>

      {/* 3-product grid */}
      <div style={{ padding: '10px 16px', background: '#0f0800' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>KITS DISPONÍVEIS</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {products.map((p, i) => (
            <div key={i} style={{ flex: 1, background: '#1a0a00', border: `1px solid ${i === 1 ? accent : '#2a1800'}`, borderRadius: 6, padding: '8px 8px', textAlign: 'center', position: 'relative' }}>
              {p.badge && (
                <div style={{ position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)', background: i === 1 ? accent : '#ef4444', borderRadius: 3, padding: '2px 5px', whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#000', fontSize: 7, fontWeight: 800 }}>{p.badge}</span>
                </div>
              )}
              <div style={{ color: '#666', fontSize: 9, textDecoration: 'line-through', marginTop: p.badge ? 6 : 0 }}>{p.oldPrice}</div>
              <div style={{ color: i === 1 ? accent : '#ddd', fontSize: 15, fontWeight: 900 }}>{p.newPrice}</div>
              <div style={{ color: '#aaa', fontSize: 9, marginTop: 2 }}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0f0800' }}>
        <div style={{ background: '#1a0a00', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e8c080', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#080400', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9 }}>Imagens ilustrativas</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
