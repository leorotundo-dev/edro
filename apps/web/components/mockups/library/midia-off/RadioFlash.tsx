'use client';

import React from 'react';

interface RadioFlashProps {
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

export const RadioFlash: React.FC<RadioFlashProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#EF4444',
}) => {
  const brand = brandName ?? name ?? 'Rádio Notícias FM';
  const headlineText = headline ?? title ?? 'FLASH: Bolsas disparam após anúncio do Banco Central';
  const bodyText = body ?? caption ?? description ?? text ?? 'O Banco Central anunciou manutenção da taxa Selic em 10,75% ao ano, surpreendendo analistas. Mais informações no boletim das 18h.';
  const accent = brandColor ?? '#EF4444';

  const waveBars = [5, 8, 12, 7, 10, 14, 9, 6, 11, 8, 13, 7, 10, 6, 9, 12, 8, 5, 10, 7, 9, 6, 8, 5, 7];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes fla-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .fla-bar-a { animation: fla-wave 0.4s ease-in-out infinite; }
        .fla-bar-b { animation: fla-wave 0.55s ease-in-out infinite 0.08s; }
        .fla-bar-c { animation: fla-wave 0.35s ease-in-out infinite 0.18s; }
        .fla-bar-d { animation: fla-wave 0.6s ease-in-out infinite 0.04s; }
        @keyframes fla-badge { 0%,100%{opacity:1;transform:scale(1)} 40%,60%{opacity:0.3;transform:scale(0.97)} }
        .fla-badge { animation: fla-badge 0.7s ease-in-out infinite; }
        @keyframes fla-border { 0%,100%{border-color:#EF444460} 50%{border-color:#EF4444} }
        .fla-border { animation: fla-border 1s ease-in-out infinite; }
        @keyframes fla-dot { 0%,100%{opacity:1} 50%{opacity:0} }
        .fla-dot { animation: fla-dot 0.6s step-end infinite; }
      `}</style>

      {/* Top urgent bar */}
      <div style={{ background: accent, padding: '6px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="fla-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: 3, flex: 1 }}>URGENTE — FLASH NOTICIOSO</span>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>

      {/* FLASH badge hero */}
      <div style={{ background: '#0d0d1f', padding: '20px 18px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 50%, ${accent}18 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div className="fla-badge" style={{ display: 'inline-block', background: accent, borderRadius: 10, padding: '10px 32px', marginBottom: 14 }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 36, letterSpacing: 4 }}>FLASH</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 6 }}>
            <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${accent})`, flex: 1 }} />
            <span style={{ color: accent, fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>BREAKING NEWS</span>
            <div style={{ height: 1, background: `linear-gradient(90deg, ${accent}, transparent)`, flex: 1 }} />
          </div>
          <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 8, padding: '12px 16px', textAlign: 'left' }}>
            <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 6 }}>MANCHETE</div>
            <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, lineHeight: 1.3 }}>{headlineText}</div>
          </div>
        </div>
      </div>

      {/* Waveform — fast/urgent */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 34 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['fla-bar-a', 'fla-bar-b', 'fla-bar-c', 'fla-bar-d'];
            const cls = clsArr[i % 4];
            return (
              <div key={i} className={cls}
                style={{ flex: 1, height: h * 2.2, background: accent, borderRadius: 2, transformOrigin: 'bottom' }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>● NO AR — 15s</span>
          <span style={{ color: '#555', fontSize: 9 }}>0:15</span>
        </div>
      </div>

      {/* Script — short 15s */}
      <div style={{ padding: '12px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — FLASH 15 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'SFX', text: 'Sinal sonoro de urgência — 3 bips curtos' },
            { time: '0:02', label: 'LOCUTOR', text: `"FLASH! ${headlineText}."` },
            { time: '0:07', label: 'LOCUTOR', text: bodyText },
            { time: '0:13', label: 'LOCUTOR', text: `"Mais informações no Boletim das 18h, aqui na ${brand}."` },
            { time: '0:15', label: 'SFX', text: 'Encerramento — 1 bip' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: `1px solid ${i === 0 || i === 4 ? accent + '40' : '#2a2a4a'}` }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: i === 0 || i === 4 ? '#ff8888' : accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Body text card */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.7, margin: 0 }}>{bodyText}</p>
          <div style={{ marginTop: 8, color: accent, fontSize: 9, fontWeight: 700 }}>
            Mais informações no boletim das 18h
          </div>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Flash Noticioso' },
            { label: 'Duração', value: '15 segundos' },
            { label: 'Tom', value: 'Urgente / Direto' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: '1px solid #2a2a4a', borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Notícias em tempo real</span>
        <div style={{ flex: 1 }} />
        <div style={{ background: accent, borderRadius: 4, padding: '2px 8px' }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>URGENTE</span>
        </div>
      </div>
    </div>
  );
};
