'use client';

import React from 'react';

interface RadioPromocaoProps {
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

export const RadioPromocao: React.FC<RadioPromocaoProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#F59E0B',
}) => {
  const brand = brandName ?? name ?? 'Lojas Centauro';
  const headlineText = headline ?? title ?? 'Mega Promoção de Aniversário — até 60% OFF!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Corra que é por tempo limitado! As melhores ofertas do ano só duram até domingo. Aproveite agora e economize muito!';
  const accent = brandColor ?? '#F59E0B';

  const waveBars = [4, 7, 5, 10, 7, 12, 8, 5, 10, 8, 12, 7, 9, 6, 11, 8, 5, 9, 7, 4, 8, 6, 9, 5, 7];

  const products = [
    { name: 'Tênis Running Pro', original: 'R$ 299,90', promo: 'R$ 119,90', off: '60%' },
    { name: 'Camiseta Dry Fit', original: 'R$ 79,90', promo: 'R$ 39,90', off: '50%' },
    { name: 'Mochila Sport 30L', original: 'R$ 199,90', promo: 'R$ 99,90', off: '50%' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes pro-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .pro-bar-a { animation: pro-wave 0.42s ease-in-out infinite; }
        .pro-bar-b { animation: pro-wave 0.55s ease-in-out infinite 0.09s; }
        .pro-bar-c { animation: pro-wave 0.38s ease-in-out infinite 0.19s; }
        .pro-bar-d { animation: pro-wave 0.62s ease-in-out infinite 0.05s; }
        @keyframes pro-badge { 0%,100%{transform:scale(1) rotate(-1deg)} 50%{transform:scale(1.05) rotate(1deg)} }
        .pro-badge { animation: pro-badge 1.2s ease-in-out infinite; display:inline-block; }
        @keyframes pro-urgency { 0%,100%{background:#ff2222} 50%{background:#cc0000} }
        .pro-urgency { animation: pro-urgency 0.8s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1f1000 0%, #0d0d1f 100%)`, borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pro-badge" style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>PROMOÇÃO</span>
        </span>
        <div className="pro-urgency" style={{ borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>HOJE APENAS</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: `linear-gradient(180deg, #1f1000 0%, #0d0d1f 100%)`, padding: '16px 18px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#777', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 6 }}>PROMOÇÃO ESPECIAL</div>
          <div style={{ color: '#fff', fontSize: 17, fontWeight: 900, lineHeight: 1.3, marginBottom: 4 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 10 }}>{brand}</div>
          {/* Countdown deco */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {[{ v: '02', l: 'DIAS' }, { v: '08', l: 'HORAS' }, { v: '47', l: 'MIN' }, { v: '22', l: 'SEG' }].map((t, i) => (
              <div key={i} style={{ background: `${accent}20`, border: `1px solid ${accent}50`, borderRadius: 6, padding: '5px 8px', textAlign: 'center', minWidth: 42 }}>
                <div style={{ color: accent, fontSize: 15, fontWeight: 900 }}>{t.v}</div>
                <div style={{ color: '#666', fontSize: 7, fontWeight: 700 }}>{t.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Products on sale */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>PRODUTOS EM PROMOÇÃO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {products.map((p, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderRadius: 7, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
              <div style={{ background: accent, minWidth: 44, alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '6px 4px' }}>
                <span style={{ color: '#000', fontWeight: 900, fontSize: 13 }}>{p.off}</span>
                <span style={{ color: 'rgba(0,0,0,0.7)', fontWeight: 700, fontSize: 7 }}>OFF</span>
              </div>
              <div style={{ padding: '7px 12px', flex: 1 }}>
                <div style={{ color: '#ddd', fontSize: 10, fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: '#555', fontSize: 9, textDecoration: 'line-through', marginTop: 1 }}>{p.original}</div>
              </div>
              <div style={{ padding: '7px 12px', textAlign: 'right' }}>
                <div style={{ color: '#555', fontSize: 7 }}>POR APENAS</div>
                <div style={{ color: accent, fontSize: 14, fontWeight: 900 }}>{p.promo}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['pro-bar-a', 'pro-bar-b', 'pro-bar-c', 'pro-bar-d'];
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
            { time: '0:00', label: 'TRILHA', text: 'Música urgente e animada — impacto total' },
            { time: '0:02', label: 'LOCUTOR', text: `"${headlineText}!"` },
            { time: '0:05', label: 'LOCUTOR', text: 'Tênis Running Pro por R$ 119,90! Camiseta Dry Fit por R$ 39,90! Mochila Sport por R$ 99,90!' },
            { time: '0:18', label: 'LOCUTOR', text: bodyText },
            { time: '0:26', label: 'LOCUTOR', text: `"${brand}. Corra que é por tempo limitado!"` },
            { time: '0:30', label: 'TRILHA', text: 'Encerramento com energia' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Participation mechanic */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ background: accent, borderRadius: 6, padding: '8px 12px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>COMO</div>
            <div style={{ color: '#000', fontSize: 9, fontWeight: 900 }}>PARTICIPAR</div>
          </div>
          <div>
            <div style={{ color: '#ccc', fontSize: 10, lineHeight: 1.6 }}>Acesse <span style={{ color: accent, fontWeight: 700 }}>centauro.com.br</span> ou vá à loja mais próxima. Desconto válido até domingo ou enquanto durarem os estoques.</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Comercial de Promoção 30s</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
