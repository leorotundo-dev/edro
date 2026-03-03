'use client';

import React from 'react';

interface RadioEntrevistaProps {
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

export const RadioEntrevista: React.FC<RadioEntrevistaProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#0EA5E9',
}) => {
  const brand = brandName ?? name ?? 'Rádio Diálogo FM';
  const headlineText = headline ?? title ?? 'Entrevista Especial — O Futuro da Economia';
  const bodyText = body ?? caption ?? description ?? text ?? 'Conversamos com um dos maiores especialistas em economia do país sobre os desafios e oportunidades para os próximos anos. Uma entrevista que você não pode perder.';
  const accent = brandColor ?? '#0EA5E9';

  const waveBars = [4, 7, 5, 9, 6, 11, 7, 4, 8, 10, 6, 5, 9, 7, 11, 6, 8, 5, 4, 7, 9, 6, 5, 7, 4];

  const dialogue = [
    { role: 'ENTREVISTADOR', side: 'left', text: 'Qual sua visão sobre o cenário econômico para os próximos 12 meses?' },
    { role: 'CONVIDADO', side: 'right', text: 'Vemos uma janela de oportunidade única. O Brasil está posicionado estrategicamente para crescimento sustentável.' },
    { role: 'ENTREVISTADOR', side: 'left', text: 'E quais seriam os principais riscos a monitorar?' },
    { role: 'CONVIDADO', side: 'right', text: 'A volatilidade cambial e o cenário fiscal merecem atenção, mas os fundamentos são sólidos.' },
  ];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes ent-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .ent-bar-a { animation: ent-wave 0.6s ease-in-out infinite; }
        .ent-bar-b { animation: ent-wave 0.75s ease-in-out infinite 0.12s; }
        .ent-bar-c { animation: ent-wave 0.5s ease-in-out infinite 0.22s; }
        .ent-bar-d { animation: ent-wave 0.85s ease-in-out infinite 0.07s; }
        @keyframes ent-live { 0%,100%{opacity:1} 50%{opacity:0.2} }
        .ent-live { animation: ent-live 1s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d0d1f', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>ENTREVISTA</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#1a0808', border: '1px solid #ff222240', borderRadius: 4, padding: '3px 8px' }}>
          <div className="ent-live" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4444', flexShrink: 0 }} />
          <span style={{ color: '#ff4444', fontWeight: 700, fontSize: 10 }}>AO VIVO</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>45s</span>
        </div>
      </div>

      {/* Two-participant header */}
      <div style={{ background: '#0d0d1f', padding: '14px 18px', borderBottom: '1px solid #2a2a4a' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 10, textAlign: 'center' }}>{headlineText}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Entrevistador */}
          <div style={{ flex: 1, background: '#111', border: `1px solid ${accent}30`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${accent}20`, border: `2px solid ${accent}`, margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
              </svg>
            </div>
            <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 2 }}>ENTREVISTADOR</div>
            <div style={{ color: '#ccc', fontSize: 10, fontWeight: 600 }}>{brand}</div>
            <div style={{ color: '#555', fontSize: 8, marginTop: 2 }}>Jornalista</div>
          </div>

          {/* VS divider */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />
            <div style={{ color: '#555', fontSize: 9, fontWeight: 700 }}>✕</div>
            <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />
          </div>

          {/* Entrevistado */}
          <div style={{ flex: 1, background: '#111', border: `1px solid #33336640`, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#2a2a4a', border: '2px solid #555', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2">
                <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
              </svg>
            </div>
            <div style={{ color: '#888', fontSize: 9, fontWeight: 700, marginBottom: 2 }}>CONVIDADO</div>
            <div style={{ color: '#ccc', fontSize: 10, fontWeight: 600 }}>Dr. Carlos Mendes</div>
            <div style={{ color: '#555', fontSize: 8, marginTop: 2 }}>Economista Chefe</div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['ent-bar-a', 'ent-bar-b', 'ent-bar-c', 'ent-bar-d'];
            const cls = clsArr[i % 4];
            const active = i < 16;
            return (
              <div key={i} className={active ? cls : ''}
                style={{ flex: 1, height: h * 2.2, background: active ? accent : '#1e1e3a', borderRadius: 2, transformOrigin: 'bottom', opacity: active ? 1 : 0.3 }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>● GRAVANDO</span>
          <span style={{ color: '#555', fontSize: 9 }}>0:45</span>
        </div>
      </div>

      {/* Context description */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}25`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <p style={{ color: '#bbb', fontSize: 10, lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>{bodyText}</p>
        </div>
      </div>

      {/* Dialogue script */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>TRECHO DO ROTEIRO</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {dialogue.map((d, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: d.side === 'right' ? 'row-reverse' : 'row',
              gap: 8,
              alignItems: 'flex-start',
            }}>
              <div style={{ background: d.side === 'left' ? accent : '#2a2a4a', borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: d.side === 'left' ? '#fff' : '#aaa', fontSize: 7, fontWeight: 800 }}>
                  {d.side === 'left' ? 'P' : 'R'}
                </span>
              </div>
              <div style={{
                background: '#0d0d1f',
                border: `1px solid ${d.side === 'left' ? accent + '30' : '#2a2a4a'}`,
                borderRadius: 6,
                padding: '7px 10px',
                maxWidth: '85%',
              }}>
                <div style={{ color: d.side === 'left' ? accent : '#888', fontSize: 7, fontWeight: 700, marginBottom: 3 }}>{d.role}</div>
                <div style={{ color: '#bbb', fontSize: 10, lineHeight: 1.5 }}>{d.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Guest info */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: '1px solid #2a2a4a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ color: '#555', fontSize: 8, fontWeight: 700, letterSpacing: 2, marginBottom: 6 }}>CONVIDADO</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#2a2a4a', border: '2px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#888', fontSize: 14, fontWeight: 900 }}>C</span>
            </div>
            <div>
              <div style={{ color: '#ddd', fontSize: 11, fontWeight: 700 }}>Dr. Carlos Mendes</div>
              <div style={{ color: '#777', fontSize: 9 }}>Economista Chefe · Instituto de Finanças</div>
              <div style={{ color: accent, fontSize: 9, fontWeight: 600, marginTop: 2 }}>Especialidade: Macroeconomia · 20 anos de experiência</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#0d0d1f', borderTop: '1px solid #2a2a4a', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Entrevistas ao vivo toda semana</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
