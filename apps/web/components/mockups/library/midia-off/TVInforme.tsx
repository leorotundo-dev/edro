'use client';

import React from 'react';

interface TVInformeProps {
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

export const TVInforme: React.FC<TVInformeProps> = ({
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
  brandColor = '#F59E0B',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Informe Publicitário — Solução completa para você.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Conheça todos os benefícios do nosso produto. Qualidade comprovada, preço justo e atendimento diferenciado.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#F59E0B';

  const products = [
    { name: 'Kit Básico', price: 'R$ 49,90', highlight: false },
    { name: 'Kit Premium', price: 'R$ 89,90', highlight: true },
    { name: 'Kit Família', price: 'R$ 129,90', highlight: false },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0a0800', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      <style>{`
        @keyframes informe-ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-100%)} }
        .informe-ticker { animation: informe-ticker 12s linear infinite; }
        @keyframes informe-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .informe-pulse { animation: informe-pulse 1s ease-in-out infinite; }
      `}</style>

      {/* Header — infomercial style */}
      <div style={{ background: `linear-gradient(135deg, ${accent}22, #1a1200)`, borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px' }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>INFORME</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#f0d060', fontSize: 12, fontWeight: 600 }}>Informe Publicitário</div>
          <div style={{ color: '#888', fontSize: 10 }}>Produto em destaque</div>
        </div>
        <div style={{ background: '#1a1200', border: `1px solid ${accent}`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>60s</span>
        </div>
      </div>

      {/* Ticker */}
      <div style={{ background: accent, overflow: 'hidden', height: 24, display: 'flex', alignItems: 'center' }}>
        <span className="informe-ticker" style={{ color: '#000', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', paddingLeft: '100%' }}>
          ★ LIGUE AGORA E PEÇA O SEU ★ OFERTA POR TEMPO LIMITADO ★ FRETE GRÁTIS PARA TODO O BRASIL ★ PARCELE EM ATÉ 12X SEM JUROS ★
        </span>
      </div>

      {/* Product showcase */}
      <div style={{ background: '#0f0c00', padding: '12px 16px 10px' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          {/* Product image */}
          <div style={{ width: 100, flexShrink: 0 }}>
            {img
              ? <img src={img} alt={brand} style={{ width: 100, height: 90, objectFit: 'cover', borderRadius: 8, border: `2px solid ${accent}60` }} />
              : <div style={{ width: 100, height: 90, background: '#1a1500', borderRadius: 8, border: `2px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={`${accent}80`} strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                </div>
            }
            <div style={{ background: '#ef4444', borderRadius: 4, padding: '2px 6px', marginTop: 6, textAlign: 'center' }}>
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>MAIS VENDIDO</span>
            </div>
          </div>
          {/* Product info */}
          <div style={{ flex: 1 }}>
            <div style={{ color: accent, fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{brand}</div>
            <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.5, margin: '0 0 8px' }}>{headlineText}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ color: '#666', fontSize: 10, textDecoration: 'line-through' }}>R$ 199,90</span>
              <span style={{ color: accent, fontSize: 20, fontWeight: 900 }}>R$ 89,90</span>
            </div>
            <div style={{ color: '#888', fontSize: 9 }}>ou 12x de R$ 7,49 sem juros</div>
          </div>
        </div>
      </div>

      {/* Product grid */}
      <div style={{ padding: '0 16px 10px', background: '#0f0c00' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {products.map((p, i) => (
            <div key={i} style={{ flex: 1, background: p.highlight ? `${accent}20` : '#1a1500', border: `1px solid ${p.highlight ? accent : '#2a2000'}`, borderRadius: 6, padding: '8px 8px', textAlign: 'center' }}>
              {p.highlight && <div style={{ background: accent, borderRadius: 3, padding: '1px 5px', marginBottom: 4, display: 'inline-block' }}><span style={{ color: '#000', fontSize: 7, fontWeight: 700 }}>DESTAQUE</span></div>}
              <div style={{ color: p.highlight ? '#fff' : '#ccc', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
              <div style={{ color: accent, fontSize: 13, fontWeight: 800 }}>{p.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA phone number */}
      <div style={{ padding: '10px 16px', background: '#1a1200', borderTop: `1px solid ${accent}30`, borderBottom: `1px solid ${accent}30` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="informe-pulse" style={{ background: accent, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.42 2 2 0 0 1 3.6 1.26h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.7 16.92z"/></svg>
          </div>
          <div>
            <div style={{ color: accent, fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>0800 000 0000</div>
            <div style={{ color: '#888', fontSize: 9 }}>Ligue agora • Seg–Sex 8h–20h • Ligação gratuita</div>
          </div>
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '10px 16px 10px', background: '#0f0c00' }}>
        <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, margin: 0 }}>{bodyText}</p>
      </div>

      {/* Footer */}
      <div style={{ background: '#080600', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9 }}>Imagens meramente ilustrativas</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
