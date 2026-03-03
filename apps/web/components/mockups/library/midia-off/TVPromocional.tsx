'use client';

import React from 'react';

interface TVPromocionalProps {
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

export const TVPromocional: React.FC<TVPromocionalProps> = ({
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
  brandColor = '#EF4444',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Oferta por tempo limitado. Corra!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Promoção exclusiva com desconto especial. Válido somente esta semana. Não perca!';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#EF4444';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes promo-shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-1deg)} 75%{transform:rotate(1deg)} }
        .promo-shake { animation: promo-shake 0.4s ease-in-out infinite; }
        @keyframes promo-flash { 0%,100%{background:${accent}} 50%{background:#ff6666} }
        .promo-flash { animation: promo-flash 0.8s ease-in-out infinite; }
        @keyframes promo-ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        .promo-ticker { animation: promo-ticker 8s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a0a0a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="promo-flash" style={{ borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>PROMOÇÃO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Spot Promocional TV</div>
          <div style={{ color: '#888', fontSize: 10 }}>Oferta limitada • Urgência</div>
        </div>
        <div style={{ background: '#2a0a0a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>15s</span>
        </div>
      </div>

      {/* Urgency ticker */}
      <div style={{ background: accent, overflow: 'hidden', height: 22, display: 'flex', alignItems: 'center' }}>
        <span className="promo-ticker" style={{ color: '#fff', fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', paddingLeft: '100%' }}>
          ⚡ OFERTA RELÂMPAGO ⚡ SÓ HOJE ⚡ ÚLTIMAS UNIDADES ⚡ PREÇO IMPERDÍVEL ⚡ APROVEITE AGORA ⚡
        </span>
      </div>

      {/* Promo hero */}
      <div style={{ background: '#140000', padding: '16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at center, ${accent}15 0%, transparent 70%)` }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
          {/* Image */}
          <div style={{ flexShrink: 0 }}>
            {img
              ? <img src={img} alt={brand} style={{ width: 90, height: 80, objectFit: 'cover', borderRadius: 8, border: `2px solid ${accent}60` }} />
              : <div style={{ width: 90, height: 80, background: '#1e0000', borderRadius: 8, border: `2px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={`${accent}60`} strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
            }
          </div>
          {/* Discount badge */}
          <div>
            <div className="promo-shake" style={{ display: 'inline-block', background: accent, borderRadius: 8, padding: '6px 14px', marginBottom: 8 }}>
              <span style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1 }}>50%</span>
              <span style={{ color: '#ffdddd', fontSize: 11, display: 'block', fontWeight: 700 }}>DE DESCONTO</span>
            </div>
            <div style={{ color: '#888', fontSize: 10, textDecoration: 'line-through' }}>de R$ 299,90</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>por R$ 149,90</div>
            <div style={{ color: accent, fontSize: 10, fontWeight: 600 }}>ou 6x de R$ 24,98</div>
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div style={{ background: '#1a0a0a', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span style={{ color: '#ccc', fontSize: 11 }}>Oferta termina em:</span>
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[{ v: '02', l: 'dias' }, { v: '18', l: 'horas' }, { v: '43', l: 'min' }, { v: '21', l: 'seg' }].map((c, i) => (
            <div key={i} style={{ background: '#2a0a0a', border: `1px solid ${accent}50`, borderRadius: 4, padding: '3px 6px', textAlign: 'center' }}>
              <div style={{ color: accent, fontSize: 14, fontWeight: 900, lineHeight: 1 }}>{c.v}</div>
              <div style={{ color: '#666', fontSize: 7 }}>{c.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard */}
      <div style={{ padding: '10px 16px 8px', background: '#141414' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: '01', label: 'Gancho', sub: '0–4s', bg: '#1a0000' },
            { n: '02', label: 'Oferta', sub: '4–11s', bg: '#200000' },
            { n: '03', label: 'CTA', sub: '11–15s', bg: '#1a0a00' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#1e1e1e', border: `1px solid ${i === 1 ? accent : '#333'}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 44, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i === 1
                  ? <span style={{ color: accent, fontSize: 16, fontWeight: 900 }}>-50%</span>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }
              </div>
              <div style={{ padding: '3px 5px', background: '#111' }}>
                <span style={{ color: i === 1 ? accent : '#888', fontSize: 8, fontWeight: 700, display: 'block' }}>#{f.n}</span>
                <span style={{ color: '#aaa', fontSize: 8, display: 'block' }}>{f.label}</span>
                <span style={{ color: '#555', fontSize: 8 }}>{f.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
