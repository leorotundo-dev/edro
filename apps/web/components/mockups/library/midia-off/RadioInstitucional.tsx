'use client';

import React from 'react';

interface RadioInstitucionalProps {
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

export const RadioInstitucional: React.FC<RadioInstitucionalProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#1E3A5F',
}) => {
  const brand = brandName ?? name ?? 'Grupo Excelência';
  const headlineText = headline ?? title ?? 'Construindo o futuro com propósito e excelência';
  const bodyText = body ?? caption ?? description ?? text ?? 'Há mais de 40 anos, transformando vidas através da inovação, do compromisso com a qualidade e do respeito às pessoas. Somos parte da história deste país.';
  const accent = brandColor ?? '#1E3A5F';
  const accentLight = '#4A7FBF';

  const waveBars = [3, 4, 6, 5, 7, 6, 8, 5, 7, 9, 6, 5, 8, 6, 9, 7, 5, 8, 6, 4, 7, 5, 6, 4, 5];

  const achievements = [
    { num: '40+', label: 'Anos de história' },
    { num: '12', label: 'Países de atuação' },
    { num: '8.500', label: 'Colaboradores' },
    { num: 'AAA', label: 'Rating de crédito' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes ins-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .ins-bar-a { animation: ins-wave 0.7s ease-in-out infinite; }
        .ins-bar-b { animation: ins-wave 0.85s ease-in-out infinite 0.14s; }
        .ins-bar-c { animation: ins-wave 0.6s ease-in-out infinite 0.26s; }
        .ins-bar-d { animation: ins-wave 0.95s ease-in-out infinite 0.08s; }
      `}</style>

      {/* Header */}
      <div style={{ background: accent, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '5px 12px', border: '1px solid rgba(255,255,255,0.25)' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 12, letterSpacing: 1 }}>INSTITUCIONAL</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>60s</span>
        </div>
      </div>

      {/* Brand hero */}
      <div style={{ background: `linear-gradient(160deg, ${accent} 0%, #0d0d1f 55%)`, padding: '22px 18px 16px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: 180, height: 180, background: `radial-gradient(circle, ${accentLight}20 0%, transparent 70%)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.12)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </div>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 600, letterSpacing: 2, marginBottom: 3 }}>SPOT INSTITUCIONAL</div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 900 }}>{brand}</div>
            </div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, lineHeight: 1.4, fontStyle: 'italic' }}>"{headlineText}"</div>
        </div>
      </div>

      {/* Achievement grid */}
      <div style={{ padding: '12px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>CONQUISTAS</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {achievements.map((a, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid ${accentLight}30`, borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ color: accentLight, fontSize: 16, fontWeight: 900, marginBottom: 2 }}>{a.num}</div>
              <div style={{ color: '#666', fontSize: 8, lineHeight: 1.3 }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['ins-bar-a', 'ins-bar-b', 'ins-bar-c', 'ins-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 18;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2, background: active ? accentLight : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accentLight, fontSize: 9, fontWeight: 700 }}>● SPOT 60s</span>
          <span style={{ color: '#555', fontSize: 9 }}>1:00</span>
        </div>
      </div>

      {/* Mission text */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accentLight}25`, borderLeft: `3px solid ${accentLight}`, borderRadius: 6, padding: '12px 14px' }}>
          <div style={{ color: accentLight, fontSize: 9, fontWeight: 700, marginBottom: 6 }}>LOCUTOR (tom refinado, confiante):</div>
          <p style={{ color: '#ccc', fontSize: 11, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>"{bodyText}"</p>
        </div>
      </div>

      {/* Full script */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO — 60 SEGUNDOS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            { time: '0:00', label: 'TRILHA', text: 'Música orquestral — refinada, inspiradora (entra sob locutor)' },
            { time: '0:03', label: 'LOCUTOR', text: `"${headlineText}."` },
            { time: '0:10', label: 'LOCUTOR', text: bodyText },
            { time: '0:35', label: 'LOCUTOR', text: `"Inovação que transforma. Compromisso que perdura. ${brand}."` },
            { time: '0:50', label: 'LOCUTOR', text: `"${brand}. Há mais de 40 anos, parte desta história."` },
            { time: '0:57', label: 'TRILHA', text: 'Assinatura sonora + fade elegante' },
          ].map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, background: '#0d0d1f', borderRadius: 6, padding: '6px 10px', border: '1px solid #2a2a4a' }}>
              <span style={{ color: '#555', fontSize: 8, fontWeight: 700, minWidth: 28, flexShrink: 0, paddingTop: 1 }}>{line.time}</span>
              <span style={{ color: accentLight, fontSize: 8, fontWeight: 800, minWidth: 50, flexShrink: 0, paddingTop: 1 }}>{line.label}:</span>
              <span style={{ color: '#aaa', fontSize: 9, lineHeight: 1.5 }}>{line.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Values */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>VALORES DA MARCA</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Excelência', 'Inovação', 'Integridade', 'Sustentabilidade', 'Pessoas'].map((v, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid ${accentLight}30`, borderRadius: 20, padding: '4px 10px' }}>
              <span style={{ color: accentLight, fontSize: 9, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: 'Spot Institucional' },
            { label: 'Duração', value: '60 segundos' },
            { label: 'Tom', value: 'Refinado / Formal' },
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentLight} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Spot Institucional 60s</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accentLight, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
