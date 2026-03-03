'use client';

import React from 'react';

interface RadioOfertasProps {
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

export const RadioOfertas: React.FC<RadioOfertasProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#F97316',
}) => {
  const brand = brandName ?? name ?? 'Supermercado Máximo';
  const headlineText = headline ?? title ?? 'As melhores ofertas da semana estão aqui!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Corra ao Supermercado Máximo e aproveite as ofertas imperdíveis desta semana. Só até sábado ou enquanto durarem os estoques!';
  const accent = brandColor ?? '#F97316';

  const waveBars = [4, 7, 5, 9, 6, 11, 8, 5, 9, 7, 10, 6, 8, 5, 9, 7, 11, 6, 8, 5, 7, 9, 5, 6, 8];

  const offers = [
    { product: 'Frango inteiro (kg)', from: 'R$ 18,90', price: 'R$ 11,99', off: '37% OFF' },
    { product: 'Arroz 5kg', from: 'R$ 28,90', price: 'R$ 19,90', off: '31% OFF' },
    { product: 'Refrigerante 2L', from: 'R$ 9,90', price: 'R$ 5,99', off: '40% OFF' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes ofe-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .ofe-bar-a { animation: ofe-wave 0.45s ease-in-out infinite; }
        .ofe-bar-b { animation: ofe-wave 0.58s ease-in-out infinite 0.1s; }
        .ofe-bar-c { animation: ofe-wave 0.4s ease-in-out infinite 0.2s; }
        .ofe-bar-d { animation: ofe-wave 0.65s ease-in-out infinite 0.05s; }
        @keyframes ofe-price { 0%,100%{transform:scale(1)} 50%{transform:scale(1.06)} }
        .ofe-price { animation: ofe-price 1.4s ease-in-out infinite; display:inline-block; }
        @keyframes ofe-badge { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .ofe-badge { animation: ofe-badge 0.9s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1f0a00 0%, #0d0d1f 100%)`, borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="ofe-badge" style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>OFERTA</span>
        </div>
        <div style={{ background: '#ff2222', borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>VÁLIDO SÓ HOJE</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Headline hero */}
      <div style={{ background: `linear-gradient(180deg, #1f0a00 0%, #0d0d1f 100%)`, padding: '16px 18px 12px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#777', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 6 }}>COMERCIAL DE OFERTAS</div>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 900, lineHeight: 1.3, marginBottom: 4 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 600 }}>{brand}</div>
        </div>
      </div>

      {/* Offers grid */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>DESTAQUES DA SEMANA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {offers.map((o, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ background: accent, padding: '0 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 56, alignSelf: 'stretch' }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 10, textAlign: 'center', lineHeight: 1.2 }}>{o.off}</span>
                </div>
                <div style={{ padding: '8px 12px', flex: 1 }}>
                  <div style={{ color: '#ddd', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{o.product}</div>
                  <div style={{ color: '#555', fontSize: 9, textDecoration: 'line-through' }}>De {o.from}</div>
                </div>
                <div style={{ padding: '8px 12px', textAlign: 'right' }}>
                  <div style={{ color: '#555', fontSize: 8 }}>POR APENAS</div>
                  <span className="ofe-price" style={{ color: accent, fontSize: 18, fontWeight: 900 }}>{o.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['ofe-bar-a', 'ofe-bar-b', 'ofe-bar-c', 'ofe-bar-d'];
            const cls = clsArr[i % 4];
            return (
              <div key={i} className={cls}
                style={{ flex: 1, height: h * 2, background: accent, borderRadius: 2, transformOrigin: 'bottom' }} />
            );
          })}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — 30 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Música animada e urgente — abre com impacto' },
            { time: '0:02', label: 'LOCUTOR', text: `"${headlineText}"` },
            { time: '0:05', label: 'LOCUTOR', text: 'Frango inteiro, por apenas R$ 11,99 o quilo! Arroz 5kg, por R$ 19,90! Refrigerante 2L, por apenas R$ 5,99!' },
            { time: '0:20', label: 'LOCUTOR', text: bodyText },
            { time: '0:27', label: 'LOCUTOR', text: `"${brand}. Economize de verdade!"` },
            { time: '0:30', label: 'TRILHA', text: 'Encerramento enérgico' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact + urgency */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#555', fontSize: 8, marginBottom: 3 }}>ENDEREÇO</div>
            <div style={{ color: '#ddd', fontSize: 10, fontWeight: 700 }}>Av. Central, 1.200 — Centro</div>
            <div style={{ color: accent, fontSize: 10, fontWeight: 700, marginTop: 2 }}>(11) 3333-0000</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: '#ff2222', borderRadius: 6, padding: '4px 10px', marginBottom: 4 }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 10 }}>Só até Sábado!</span>
            </div>
            <div style={{ color: '#555', fontSize: 8 }}>Enquanto durarem os estoques</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Comercial de Ofertas 30s</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
