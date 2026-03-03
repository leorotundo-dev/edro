'use client';

import React from 'react';

interface RadioChamadaProps {
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

export const RadioChamada: React.FC<RadioChamadaProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#8B5CF6',
}) => {
  const brand = brandName ?? name ?? 'Rádio Conecta FM';
  const headlineText = headline ?? title ?? 'O Programa que Transforma sua Manhã';
  const bodyText = body ?? caption ?? description ?? text ?? 'Terças e Quintas, às 20h, é hora de mergulhar em conteúdo que faz diferença. Histórias reais, convidados especiais e você, o ouvinte, fazendo parte. Ouça e participe!';
  const accent = brandColor ?? '#8B5CF6';

  const waveBars = [4, 6, 9, 5, 8, 12, 7, 5, 9, 11, 6, 4, 8, 10, 7, 5, 9, 6, 4, 7, 8, 5, 6, 4, 7];

  const schedule = [
    { day: 'TER', time: '20h00', active: true },
    { day: 'QUI', time: '20h00', active: true },
    { day: 'SAB', time: '10h00', active: false },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes cha-wave { 0%,100%{transform:scaleY(0.2)} 50%{transform:scaleY(1)} }
        .cha-bar-a { animation: cha-wave 0.6s ease-in-out infinite; }
        .cha-bar-b { animation: cha-wave 0.75s ease-in-out infinite 0.1s; }
        .cha-bar-c { animation: cha-wave 0.5s ease-in-out infinite 0.2s; }
        .cha-bar-d { animation: cha-wave 0.85s ease-in-out infinite 0.15s; }
        @keyframes cha-glow { 0%,100%{box-shadow:0 0 6px rgba(139,92,246,0.4)} 50%{box-shadow:0 0 18px rgba(139,92,246,0.7)} }
        .cha-glow { animation: cha-glow 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d0d1f 0%, #1a0d2e 100%)', borderBottom: `3px solid ${accent}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>PROGRAMA</span>
        </div>
        <div style={{ background: '#1a0d2e', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>CHAMADA</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        </div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Program title hero */}
      <div style={{ background: 'linear-gradient(180deg, #1a0d2e 0%, #0d0d1f 100%)', padding: '20px 18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}20 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#666', fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>Chamada de Programa</div>
          <div style={{ color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1.2, marginBottom: 6 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>com {brand}</div>

          {/* Schedule pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {schedule.map((s, i) => (
              <div
                key={i}
                className={s.active ? 'cha-glow' : ''}
                style={{
                  background: s.active ? accent : '#1a1a3a',
                  border: `1px solid ${s.active ? accent : '#333'}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  textAlign: 'center',
                }}
              >
                <div style={{ color: s.active ? '#fff' : '#555', fontWeight: 900, fontSize: 13 }}>{s.day}</div>
                <div style={{ color: s.active ? 'rgba(255,255,255,0.85)' : '#444', fontSize: 10, fontWeight: 600 }}>{s.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '10px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['cha-bar-a', 'cha-bar-b', 'cha-bar-c', 'cha-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 15;
            return (
              <div
                key={i}
                className={active ? cls : ''}
                style={{
                  flex: 1,
                  height: h * 2.5,
                  background: active ? accent : '#1e1e3a',
                  borderRadius: 2,
                  transformOrigin: 'bottom',
                  opacity: active ? 1 : 0.35,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>● EM EXIBIÇÃO</span>
          <span style={{ color: '#555', fontSize: 9 }}>0:30</span>
        </div>
      </div>

      {/* Teaser script */}
      <div style={{ padding: '12px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 10, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <div style={{ width: 3, height: 20, background: accent, borderRadius: 2 }} />
            <span style={{ color: accent, fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>LOCUTOR</span>
          </div>
          <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.7, margin: '0 0 12px 0', fontStyle: 'italic' }}>
            "{bodyText}"
          </p>
          <div style={{ height: 1, background: `linear-gradient(90deg, ${accent}40, transparent)`, marginBottom: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ background: accent, borderRadius: 20, padding: '4px 14px' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>Ouça e participe!</span>
            </div>
            <span style={{ color: '#555', fontSize: 9 }}>— CTA de encerramento</span>
          </div>
        </div>
      </div>

      {/* Script lines */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { label: 'TRILHA', text: 'Música de abertura — animada, upbeat (3s)' },
            { label: 'LOCUTOR', text: `Você já conhece o programa mais aguardado da semana? "${headlineText}".` },
            { label: 'SFX', text: 'Efeito de transição (0.5s)' },
            { label: 'LOCUTOR', text: `Terças e Quintas, às 20h, aqui na ${brand}. Ouça e participe!` },
            { label: 'TRILHA', text: 'Música fade out (2s)' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '7px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 52, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Production specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Chamada de Programa' },
            { label: 'Duração', value: '30 segundos' },
            { label: 'Frequência', value: '3x por semana' },
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
        <span style={{ color: '#555', fontSize: 9 }}>Veiculação programada — grade de chamadas</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
