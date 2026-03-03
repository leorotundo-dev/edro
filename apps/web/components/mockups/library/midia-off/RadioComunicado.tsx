'use client';

import React from 'react';

interface RadioComunicadoProps {
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

export const RadioComunicado: React.FC<RadioComunicadoProps> = ({
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
  const brand = brandName ?? name ?? 'Prefeitura Municipal';
  const headlineText = headline ?? title ?? 'Comunicado Importante à População';
  const bodyText = body ?? caption ?? description ?? text ?? 'A Prefeitura Municipal informa que, a partir de segunda-feira, o Parque Ecológico Central estará fechado para manutenção. A previsão de reabertura é dia 17 de março. Pedimos desculpas pelo transtorno.';
  const accent = brandColor ?? '#EF4444';

  const waveBars = [4, 6, 5, 8, 7, 10, 6, 5, 9, 7, 5, 8, 11, 7, 5, 9, 7, 5, 4, 7, 6, 8, 5, 4, 7];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes com-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .com-bar-a { animation: com-wave 0.6s ease-in-out infinite; }
        .com-bar-b { animation: com-wave 0.75s ease-in-out infinite 0.1s; }
        .com-bar-c { animation: com-wave 0.5s ease-in-out infinite 0.22s; }
        .com-bar-d { animation: com-wave 0.9s ease-in-out infinite 0.08s; }
        @keyframes com-blink { 0%,100%{opacity:1} 45%,55%{opacity:0} }
        .com-blink { animation: com-blink 1.2s step-end infinite; }
      `}</style>

      {/* Header — official red bar */}
      <div style={{ background: accent, padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="com-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
        <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 2, flex: 1 }}>COMUNICADO OFICIAL</span>
        <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 4, padding: '2px 8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700 }}>NO AR</span>
        </div>
        <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 11 }}>60s</span>
        </div>
      </div>

      {/* Institution card */}
      <div style={{ background: '#0d0d1f', padding: '16px 18px', borderBottom: '1px solid #2a2a4a', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${accent}15`, border: `2px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#777', fontSize: 9, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>Emissor do Comunicado</div>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{brand}</div>
          <div style={{ color: accent, fontSize: 10, fontWeight: 600, marginTop: 2 }}>Nota oficial · 03 de março de 2026</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ background: `${accent}15`, border: `1px solid ${accent}40`, borderRadius: 6, padding: '6px 10px', textAlign: 'center' }}>
          <div style={{ color: '#555', fontSize: 8 }}>Horário</div>
          <div style={{ color: accent, fontSize: 12, fontWeight: 800 }}>08h30</div>
        </div>
      </div>

      {/* Headline */}
      <div style={{ padding: '16px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 4, background: accent, borderRadius: 2, alignSelf: 'stretch', flexShrink: 0 }} />
          <div>
            <div style={{ color: '#888', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>ASSUNTO</div>
            <div style={{ color: '#fff', fontSize: 17, fontWeight: 900, lineHeight: 1.3 }}>{headlineText}</div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['com-bar-a', 'com-bar-b', 'com-bar-c', 'com-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 16;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2.2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
      </div>

      {/* Script body */}
      <div style={{ padding: '12px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>TEXTO DO COMUNICADO</div>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 6 }}>LOCUTOR (tom sério e formal):</div>
          <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.8, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Script lines */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO COMPLETO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Instrumental solene (3s) — entra sob locutor' },
            { time: '0:03', label: 'LOCUTOR', text: `"Comunicado Oficial — ${brand}."` },
            { time: '0:08', label: 'LOCUTOR', text: headlineText },
            { time: '0:14', label: 'LOCUTOR', text: bodyText },
            { time: '0:55', label: 'LOCUTOR', text: `"${brand} — a serviço da comunidade."` },
            { time: '1:00', label: 'TRILHA', text: 'Encerramento com acorde final' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accent, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Production specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Comunicado' },
            { label: 'Duração', value: '60 segundos' },
            { label: 'Tom', value: 'Formal / Sério' },
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
        <span style={{ color: '#555', fontSize: 9 }}>Veiculação em horário nobre — {brand}</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
