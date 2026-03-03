'use client';

import React from 'react';

interface RadioPatrocinioProps {
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

export const RadioPatrocinio: React.FC<RadioPatrocinioProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#7C3AED',
}) => {
  const brand = brandName ?? name ?? 'Banco Meridional';
  const programName = headline ?? title ?? 'Programa Esporte em Foco';
  const bodyText = body ?? caption ?? description ?? text ?? 'O melhor do esporte nacional, com análises e entrevistas exclusivas. Tudo isso patrocinado por Banco Meridional — investindo no esporte que você ama.';
  const accent = brandColor ?? '#7C3AED';

  const waveBars = [3, 5, 4, 7, 6, 9, 7, 5, 8, 10, 7, 5, 9, 7, 5, 8, 6, 9, 7, 5, 7, 6, 4, 6, 5];

  const mentions = [
    { phase: 'ANTES', icon: '▶', desc: 'Abertura do programa', text: `"${programName} — apresentado por ${brand}."` },
    { phase: 'DURANTE', icon: '⏸', desc: 'Intervalo comercial', text: `"Intervalo patrocinado por ${brand}. Voltamos já."` },
    { phase: 'DEPOIS', icon: '⏹', desc: 'Encerramento', text: `"${programName} — uma realização ${brand}. Até a próxima!"` },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes pat-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .pat-bar-a { animation: pat-wave 0.65s ease-in-out infinite; }
        .pat-bar-b { animation: pat-wave 0.8s ease-in-out infinite 0.13s; }
        .pat-bar-c { animation: pat-wave 0.55s ease-in-out infinite 0.25s; }
        .pat-bar-d { animation: pat-wave 0.9s ease-in-out infinite 0.07s; }
        @keyframes pat-glow { 0%,100%{box-shadow:0 0 8px rgba(124,58,237,0.3)} 50%{box-shadow:0 0 20px rgba(124,58,237,0.7)} }
        .pat-badge { animation: pat-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d1f', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="pat-badge" style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 11, letterSpacing: 1 }}>PATROCINADOR EXCLUSIVO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>15s</span>
        </div>
      </div>

      {/* Program + sponsor hero */}
      <div style={{ background: `linear-gradient(180deg, #110820 0%, #0d0d1f 100%)`, padding: '18px 18px 14px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 30% 50%, ${accent}15 0%, transparent 60%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#666', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>PATROCÍNIO DE PROGRAMA</div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            {/* Program icon */}
            <div style={{ width: 56, height: 56, borderRadius: 10, background: `${accent}20`, border: `2px solid ${accent}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/>
              </svg>
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 900, lineHeight: 1.2, marginBottom: 4 }}>{programName}</div>
              <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Apresentado por {brand}</div>
              <div style={{ color: '#666', fontSize: 9 }}>Seg–Sex · 18h às 20h · 98.7 FM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 26 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['pat-bar-a', 'pat-bar-b', 'pat-bar-c', 'pat-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 14;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <p style={{ color: '#bbb', fontSize: 10, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Before / During / After mentions */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>MENÇÕES NO PROGRAMA</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {mentions.map((m, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ background: i === 1 ? accent : `${accent}30`, padding: '8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 52, flexShrink: 0 }}>
                  <span style={{ color: i === 1 ? '#fff' : accent, fontSize: 14 }}>{m.icon}</span>
                  <span style={{ color: i === 1 ? 'rgba(255,255,255,0.8)' : accent, fontSize: 7, fontWeight: 800, marginTop: 3 }}>{m.phase}</span>
                </div>
                <div style={{ padding: '8px 12px', flex: 1 }}>
                  <div style={{ color: '#888', fontSize: 8, marginBottom: 3 }}>{m.desc}</div>
                  <div style={{ color: '#ccc', fontSize: 10, lineHeight: 1.4, fontStyle: 'italic' }}>{m.text}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — PATROCÍNIO 15s</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Tema de abertura do programa (2s)' },
            { time: '0:02', label: 'LOCUTOR', text: `"${programName} — uma realização ${brand}."` },
            { time: '0:07', label: 'LOCUTOR', text: `"${brand} — investindo no que você ama."` },
            { time: '0:13', label: 'JINGLE', text: `Assinatura sonora de ${brand}` },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Patrocínio Exclusivo' },
            { label: 'Menções', value: '3x por edição' },
            { label: 'Programa', value: 'Seg–Sex 18h' },
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
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Patrocinador exclusivo do programa</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
