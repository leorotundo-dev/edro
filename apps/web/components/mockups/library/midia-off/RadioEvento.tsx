'use client';

import React from 'react';

interface RadioEventoProps {
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

export const RadioEvento: React.FC<RadioEventoProps> = ({
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
  const brand = brandName ?? name ?? 'Rádio Eventos FM';
  const headlineText = headline ?? title ?? 'Festival de Verão São Paulo 2026';
  const bodyText = body ?? caption ?? description ?? text ?? 'Três dias de música, arte e cultura no coração da cidade. Mais de 40 atrações nacionais e internacionais. Garanta já o seu ingresso antes que esgotem!';
  const accent = brandColor ?? '#F97316';

  const waveBars = [3, 6, 8, 5, 10, 7, 4, 9, 12, 7, 5, 10, 8, 6, 11, 7, 5, 8, 6, 4, 9, 7, 5, 6, 4];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes evt-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .evt-bar-a { animation: evt-wave 0.55s ease-in-out infinite; }
        .evt-bar-b { animation: evt-wave 0.7s ease-in-out infinite 0.1s; }
        .evt-bar-c { animation: evt-wave 0.48s ease-in-out infinite 0.22s; }
        .evt-bar-d { animation: evt-wave 0.82s ease-in-out infinite 0.06s; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1f0d00 0%, #0d0d1f 100%)', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>EVENTO</span>
        </div>
        <div style={{ background: '#1f0d00', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>DIVULGAÇÃO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Event hero */}
      <div style={{ background: 'linear-gradient(180deg, #1f0d00 0%, #0d0d1f 100%)', padding: '20px 18px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 100%, ${accent}15 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#777', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>FESTIVAL · SHOW · EVENTO</div>
          <div style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.2, marginBottom: 10 }}>{headlineText}</div>

          {/* Date/time/venue chips */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              { icon: '📅', label: '14, 15 e 16 de Março' },
              { icon: '🕐', label: 'A partir das 14h' },
              { icon: '📍', label: 'Parque do Ibirapuera' },
            ].map((chip, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 10px' }}>
                <span style={{ fontSize: 10 }}>{chip.icon}</span>
                <span style={{ color: '#ccc', fontSize: 9, fontWeight: 600 }}>{chip.label}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: accent, borderRadius: 8, padding: '8px 18px' }}>
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>Garanta seu ingresso!</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['evt-bar-a', 'evt-bar-b', 'evt-bar-c', 'evt-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 16;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* Description + script */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 5 }}>LOCUTOR:</div>
          <p style={{ color: '#bbb', fontSize: 10, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Script lines */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Música animada — abertura impactante (2s)' },
            { time: '0:02', label: 'LOCUTOR', text: `"Atenção São Paulo! ${headlineText}!"` },
            { time: '0:06', label: 'LOCUTOR', text: '"14, 15 e 16 de março, a partir das 14h, no Parque do Ibirapuera."' },
            { time: '0:12', label: 'LOCUTOR', text: bodyText },
            { time: '0:25', label: 'LOCUTOR', text: `"Ingressos em festivalsp.com.br. ${brand}."` },
            { time: '0:30', label: 'TRILHA', text: 'Fade out — assinatura musical' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Attractions */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ATRAÇÕES</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Banda Alpha', 'DJ Prime', 'Orquestra SP', 'Rock Nacional', '+36 atrações'].map((a, i) => (
            <div key={i} style={{ background: i < 4 ? `${accent}15` : '#111', border: `1px solid ${i < 4 ? accent + '40' : '#2a2a4a'}`, borderRadius: 20, padding: '3px 10px' }}>
              <span style={{ color: i < 4 ? accent : '#555', fontSize: 9, fontWeight: 600 }}>{a}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Divulgação de Evento' },
            { label: 'Duração', value: '30 segundos' },
            { label: 'Inserções', value: 'Diárias' },
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
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Divulgação de eventos culturais</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
