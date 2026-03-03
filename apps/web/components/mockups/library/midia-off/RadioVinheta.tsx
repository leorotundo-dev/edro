'use client';

import React, { useState } from 'react';

interface RadioVinhetaProps {
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

export const RadioVinheta: React.FC<RadioVinhetaProps> = ({
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
  const [playing, setPlaying] = useState(false);
  const accent = brandColor ?? '#EF4444';
  const brand = brandName ?? name ?? 'Rádio Cidade FM';
  const taglineText = headline ?? title ?? 'A rádio que move a sua cidade!';
  const bodyText = body ?? caption ?? description ?? text ?? 'Rádio Cidade FM — 98.7, São Paulo.';

  const waveBars = [3, 6, 9, 7, 12, 8, 10, 6, 14, 9, 11, 7, 13, 8, 10, 6, 9, 7, 5, 8];

  const vinhetaTypes = [
    { label: 'Abertura', duration: '5s', desc: 'Identidade sonora de entrada' },
    { label: 'Passagem', duration: '3s', desc: 'Transição entre blocos' },
    { label: 'Encerramento', duration: '7s', desc: 'Assinatura de saída do programa' },
    { label: 'Hora Certa', duration: '10s', desc: 'Patrocinada — inclui marca' },
  ];

  const scriptLines = [
    { time: '0:00', label: 'SFX', text: 'Sweep de entrada — impacto sonoro imediato' },
    { time: '0:01', label: 'LOCUTOR', text: `"${taglineText}"` },
    { time: '0:03', label: 'LOCUTOR', text: `"${bodyText}"` },
    { time: '0:05', label: 'JINGLE', text: `Assinatura sonora — logomarca de ${brand}` },
  ];

  return (
    <div style={{ width: 400, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", background: '#0D0D0D', borderRadius: 16, overflow: 'hidden', boxShadow: `0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px ${accent}22`, userSelect: 'none' }}>
      <style>{`
        @keyframes vin-wave { 0%,100%{transform:scaleY(0.15)} 50%{transform:scaleY(1)} }
        .vin-bar-a { animation: vin-wave 0.35s ease-in-out infinite; }
        .vin-bar-b { animation: vin-wave 0.48s ease-in-out infinite 0.08s; }
        .vin-bar-c { animation: vin-wave 0.3s ease-in-out infinite 0.18s; }
        .vin-bar-d { animation: vin-wave 0.55s ease-in-out infinite 0.04s; }
        @keyframes vin-badge { 0%,100%{box-shadow:0 0 12px rgba(239,68,68,0.5),0 0 24px rgba(239,68,68,0.2)} 50%{box-shadow:0 0 24px rgba(239,68,68,0.9),0 0 48px rgba(239,68,68,0.4)} }
        .vin-badge { animation: vin-badge 0.8s ease-in-out infinite; }
        @keyframes vin-ring { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.12);opacity:0.6} }
        .vin-ring { animation: vin-ring 1.4s ease-in-out infinite; }
        @keyframes vin-dot { 0%,100%{opacity:1} 50%{opacity:0} }
        .vin-dot { animation: vin-dot 0.7s step-start infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1a0000 0%, #0D0D0D 100%)`, borderBottom: `3px solid ${accent}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="vin-badge" style={{ background: accent, borderRadius: 8, padding: '6px 16px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: 2 }}>VINHETA</span>
        </div>
        <div style={{ background: '#1a0000', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
          <div className="vin-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 9 }}>AO VIVO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: '#0D0D0D', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 14px' }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: 13 }}>5–15s</span>
        </div>
      </div>

      {/* Hero — Station identity */}
      <div style={{ padding: '22px 18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden', background: '#0D0D0D' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 65%)` }} />
        <div style={{ position: 'relative' }}>
          {/* Station badge ring */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div className="vin-ring" style={{ width: 72, height: 72, borderRadius: '50%', border: `3px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}15` }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" aria-hidden="true">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
                <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
              </svg>
            </div>
          </div>
          <div style={{ color: '#444', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>Identidade Sonora</div>
          <div style={{ color: accent, fontSize: 22, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>98.7 FM</div>
          <div style={{ color: '#e5e5e5', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{brand}</div>
          <div style={{ color: '#555', fontSize: 10, fontWeight: 600 }}>{taglineText}</div>
        </div>
      </div>

      {/* Waveform player */}
      <div style={{ background: '#141414', padding: '10px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button
            type="button"
            aria-label={playing ? 'Pausar vinheta' : 'Reproduzir vinheta'}
            onClick={() => setPlaying(v => !v)}
            style={{ width: 36, height: 36, borderRadius: '50%', background: accent, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 0 12px ${accent}66` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
              {playing
                ? <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
                : <polygon points="5 3 19 12 5 21 5 3" />}
            </svg>
          </button>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
            {waveBars.map((h, i) => {
              const clsArr = ['vin-bar-a', 'vin-bar-b', 'vin-bar-c', 'vin-bar-d'];
              const cls = clsArr[i % 4];
              return (
                <div
                  key={i}
                  className={playing ? cls : ''}
                  style={{ flex: 1, height: `${h * 2}px`, borderRadius: 2, background: accent, transformOrigin: 'bottom', opacity: playing ? 1 : 0.4 }}
                />
              );
            })}
          </div>
          <span style={{ color: '#444', fontSize: 9, flexShrink: 0, minWidth: 24 }}>0:07</span>
        </div>
        <div style={{ height: 2, background: '#222', borderRadius: 4 }}>
          <div style={{ width: playing ? '60%' : '0%', height: '100%', background: accent, borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Vinheta type cards */}
      <div style={{ padding: '10px 18px 8px', background: '#0D0D0D' }}>
        <div style={{ color: '#333', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Tipos de Vinheta</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {vinhetaTypes.map((v, i) => (
            <div key={i} style={{ background: '#141414', border: `1px solid ${i === 0 ? accent + '50' : '#1f1f1f'}`, borderRadius: 8, padding: '9px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: i === 0 ? accent : '#888', fontSize: 10, fontWeight: 700 }}>{v.label}</span>
                <span style={{ color: i === 0 ? accent : '#444', fontSize: 9, fontWeight: 800, background: i === 0 ? `${accent}20` : '#1f1f1f', borderRadius: 4, padding: '1px 6px' }}>{v.duration}</span>
              </div>
              <div style={{ color: '#555', fontSize: 9, lineHeight: 1.4 }}>{v.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '8px 18px 8px', background: '#0D0D0D' }}>
        <div style={{ color: '#333', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8, textTransform: 'uppercase' }}>Roteiro — Vinheta Abertura 7s</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {scriptLines.map((line, i) => {
            const labelColor = line.label === 'LOCUTOR' ? accent : line.label === 'SFX' ? '#10B981' : '#EC4899';
            return (
              <div key={i} style={{ display: 'flex', gap: 8, background: '#141414', borderRadius: 6, padding: '7px 10px', border: `1px solid #1f1f1f` }}>
                <span style={{ color: '#333', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
                <span style={{ color: labelColor, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
                <span style={{ color: '#666', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body / slogan preview */}
      <div style={{ padding: '4px 18px 10px', background: '#0D0D0D' }}>
        <div style={{ background: '#141414', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ color: '#333', fontSize: 8, fontWeight: 700, letterSpacing: 1, marginBottom: 5, textTransform: 'uppercase' }}>Slogan / Assinatura</div>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Specs bar */}
      <div style={{ padding: '0 18px 12px', background: '#0D0D0D' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Vinheta' },
            { label: 'Duração', value: '5 a 15s' },
            { label: 'Frequência', value: '98.7 FM' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#333', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#aaa', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#141414', borderTop: `1px solid ${accent}18`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" aria-hidden="true">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#333', fontSize: 9 }}>{brand} — Identidade Sonora</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
