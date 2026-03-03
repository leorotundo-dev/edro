'use client';

import React from 'react';

interface RadioClassificadoProps {
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

export const RadioClassificado: React.FC<RadioClassificadoProps> = ({
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
  const brand = brandName ?? name ?? 'Auto Center Premium';
  const headlineText = headline ?? title ?? 'Honda Civic 2022 — Impecável, com garantia';
  const bodyText = body ?? caption ?? description ?? text ?? 'Vendo Honda Civic 2022, completo, único dono, 28.000 km rodados. IPVA pago. Aceito troca por menor. Parcelo no cartão. Ligue agora e agende seu test-drive!';
  const accent = brandColor ?? '#F59E0B';

  const waveBars = [3, 5, 7, 4, 6, 9, 5, 3, 7, 10, 6, 4, 8, 5, 7, 4, 6, 8, 5, 3, 6, 7, 4, 5, 8];

  const details = [
    { label: 'Produto', value: 'Honda Civic 2022' },
    { label: 'Preço', value: 'R$ 129.900' },
    { label: 'Condição', value: 'Único dono' },
    { label: 'Km', value: '28.000 km' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes cla-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .cla-bar-a { animation: cla-wave 0.65s ease-in-out infinite; }
        .cla-bar-b { animation: cla-wave 0.8s ease-in-out infinite 0.12s; }
        .cla-bar-c { animation: cla-wave 0.5s ease-in-out infinite 0.22s; }
        .cla-bar-d { animation: cla-wave 0.7s ease-in-out infinite 0.07s; }
        @keyframes cla-price { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .cla-price { animation: cla-price 1.8s ease-in-out infinite; display:inline-block; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d1f', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>CLASSIFICADO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: '#1a1a0a', border: `1px solid ${accent}50`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>ANÚNCIO PAGO</span>
        </div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 6 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Main ad card */}
      <div style={{ padding: '16px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}35`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Ad header */}
          <div style={{ background: `linear-gradient(135deg, #1a1200 0%, #0d0d1f 100%)`, padding: '14px 16px', borderBottom: `1px solid ${accent}25` }}>
            <div style={{ color: '#777', fontSize: 9, fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>ITEM ANUNCIADO</div>
            <div style={{ color: '#fff', fontSize: 16, fontWeight: 900, lineHeight: 1.3, marginBottom: 4 }}>{headlineText}</div>
            <div style={{ color: accent, fontSize: 10, fontWeight: 600 }}>Anunciante: {brand}</div>
          </div>

          {/* Price callout */}
          <div style={{ padding: '12px 16px', background: `${accent}10`, borderBottom: `1px solid ${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ color: '#777', fontSize: 9, marginBottom: 2 }}>Valor</div>
              <span className="cla-price" style={{ color: accent, fontSize: 26, fontWeight: 900 }}>R$ 129.900</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ background: accent, borderRadius: 6, padding: '5px 12px', marginBottom: 4 }}>
                <span style={{ color: '#000', fontWeight: 800, fontSize: 11 }}>Ligue agora!</span>
              </div>
              <div style={{ color: '#666', fontSize: 10, fontWeight: 700 }}>(11) 99999-0000</div>
            </div>
          </div>

          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: `${accent}20` }}>
            {details.map((d, i) => (
              <div key={i} style={{ background: '#0d0d1f', padding: '8px 12px' }}>
                <div style={{ color: '#555', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
                <div style={{ color: '#ddd', fontSize: 10, fontWeight: 700 }}>{d.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['cla-bar-a', 'cla-bar-b', 'cla-bar-c', 'cla-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 16;
            return (
              <div
                key={i}
                className={active ? cls : ''}
                style={{ flex: 1, height: h * 2.2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }}
              />
            );
          })}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '10px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — 30 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Música de fundo leve e positiva' },
            { time: '0:02', label: 'LOCUTOR', text: `"Atenção, ouvinte! ${headlineText}."` },
            { time: '0:08', label: 'LOCUTOR', text: bodyText },
            { time: '0:25', label: 'LOCUTOR', text: `"Classifique já! Ligue para (11) 99999-0000. ${brand}."` },
            { time: '0:30', label: 'TRILHA', text: 'Encerra com fade out' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact + specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#555', fontSize: 8, marginBottom: 3 }}>CONTATO DO ANUNCIANTE</div>
            <div style={{ color: accent, fontSize: 14, fontWeight: 900 }}>(11) 99999-0000</div>
            <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>Seg–Sáb das 8h às 18h</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#555', fontSize: 8, marginBottom: 3 }}>FORMATO</div>
            <div style={{ color: '#ddd', fontSize: 10, fontWeight: 700 }}>Classificado 30s</div>
            <div style={{ color: '#555', fontSize: 9 }}>Veiculação diária</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>Espaço Classificados — 98.7 FM</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
