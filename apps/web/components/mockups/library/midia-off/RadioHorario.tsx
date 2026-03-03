'use client';

import React from 'react';

interface RadioHorarioProps {
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

export const RadioHorario: React.FC<RadioHorarioProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#6366F1',
}) => {
  const brand = brandName ?? name ?? 'Farmácias União';
  const headlineText = headline ?? title ?? 'São exatamente 10 horas';
  const bodyText = body ?? caption ?? description ?? text ?? 'Qualidade e cuidado para toda a sua família, todos os dias, em todas as horas. Farmácias União — saúde com você sempre.';
  const accent = brandColor ?? '#6366F1';

  const waveBars = [3, 5, 7, 4, 8, 6, 9, 5, 7, 10, 6, 4, 8, 6, 9, 5, 7, 4, 6, 8, 5, 7, 4, 6, 5];

  const weekSchedule = [
    { day: 'SEG', times: ['07h', '10h', '13h', '17h', '20h'] },
    { day: 'TER', times: ['07h', '10h', '13h', '17h', '20h'] },
    { day: 'QUA', times: ['07h', '10h', '13h', '17h', '20h'] },
    { day: 'QUI', times: ['07h', '10h', '13h', '17h', '20h'] },
    { day: 'SEX', times: ['07h', '10h', '13h', '17h', '20h'] },
    { day: 'SAB', times: ['09h', '12h', '15h'] },
    { day: 'DOM', times: ['10h', '14h'] },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes hor-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .hor-bar-a { animation: hor-wave 0.6s ease-in-out infinite; }
        .hor-bar-b { animation: hor-wave 0.75s ease-in-out infinite 0.12s; }
        .hor-bar-c { animation: hor-wave 0.5s ease-in-out infinite 0.22s; }
        .hor-bar-d { animation: hor-wave 0.88s ease-in-out infinite 0.07s; }
        @keyframes hor-tick { 0%{opacity:1} 49%{opacity:1} 50%{opacity:0} 99%{opacity:0} 100%{opacity:1} }
        .hor-colon { animation: hor-tick 1s step-end infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d1f', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>PATROCÍNIO</span>
        </div>
        <div style={{ background: '#111', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>HORÁRIO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>15s</span>
        </div>
      </div>

      {/* Clock hero */}
      <div style={{ background: `linear-gradient(180deg, #0d0814 0%, #0d0d1f 100%)`, padding: '20px 18px 16px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 50%, ${accent}15 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ color: '#666', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>PATROCÍNIO DE HORÁRIO</div>

          {/* Clock display */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0a0a18', border: `2px solid ${accent}40`, borderRadius: 12, padding: '12px 24px', marginBottom: 12 }}>
            <span style={{ color: accent, fontSize: 40, fontWeight: 900, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>10</span>
            <span className="hor-colon" style={{ color: accent, fontSize: 40, fontWeight: 900, margin: '0 4px' }}>:</span>
            <span style={{ color: accent, fontSize: 40, fontWeight: 900, letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>00</span>
          </div>

          <div style={{ color: '#fff', fontSize: 17, fontWeight: 800, lineHeight: 1.3, marginBottom: 4 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Patrocínio de {brand}</div>
          <div style={{ color: '#666', fontSize: 9 }}>Horário exato — Rádio 98.7 FM</div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['hor-bar-a', 'hor-bar-b', 'hor-bar-c', 'hor-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 14;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '12px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — 15 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'SFX', text: 'Sinal de hora — 3 bips (padrão horário)' },
            { time: '0:02', label: 'LOCUTOR', text: `"${headlineText}, patrocínio de ${brand}."` },
            { time: '0:06', label: 'LOCUTOR', text: bodyText },
            { time: '0:13', label: 'JINGLE', text: `"${brand} — com você o dia todo!"` },
            { time: '0:15', label: 'SFX', text: 'Assinatura sonora da marca' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tagline */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Weekly broadcast schedule */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>GRADE DE VEICULAÇÃO SEMANAL</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {weekSchedule.map((day, i) => (
            <div key={i} style={{ flex: 1, background: '#0d0d1f', border: `1px solid ${i < 5 ? accent + '40' : '#2a2a4a'}`, borderRadius: 6, padding: '5px 4px', textAlign: 'center' }}>
              <div style={{ color: i < 5 ? accent : '#666', fontSize: 8, fontWeight: 800, marginBottom: 4 }}>{day.day}</div>
              {day.times.map((t, j) => (
                <div key={j} style={{ background: i < 5 ? `${accent}15` : '#1a1a2e', borderRadius: 3, padding: '2px 0', marginBottom: 2 }}>
                  <span style={{ color: i < 5 ? '#ccc' : '#444', fontSize: 7 }}>{t}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Patrocínio de Horário' },
            { label: 'Duração', value: '15 segundos' },
            { label: 'Inserções', value: '5x ao dia' },
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
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Patrocínio de horário certo</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
