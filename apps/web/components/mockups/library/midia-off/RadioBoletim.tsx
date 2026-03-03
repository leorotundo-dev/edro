'use client';

import React from 'react';

interface RadioBoletimProps {
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

export const RadioBoletim: React.FC<RadioBoletimProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#3B82F6',
}) => {
  const brand = brandName ?? name ?? 'Rádio Notícias FM';
  const headlineText = headline ?? title ?? 'Boletim de Notícias — Apresentado por';
  const bodyText = body ?? caption ?? description ?? text ?? 'LOCUTOR: "E agora, o Boletim de Notícias, apresentado por [Marca]. Fique por dentro de tudo que acontece no Brasil e no mundo."';
  const accent = brandColor ?? '#3B82F6';

  const newsItems = [
    { time: '0:00', label: 'ABRE', text: 'Economia registra alta histórica nos mercados', sfx: 'TRILHA: Noticiosa, urgente' },
    { time: '0:08', label: 'LOCUTOR', text: 'Política nacional — agenda do governo federal para esta semana inclui votações importantes no Congresso', sfx: 'TRILHA: Mantém fundo' },
    { time: '0:18', label: 'FECHA', text: 'Esportes: seleção brasileira se prepara para amistosos internacionais', sfx: 'SFX: Encerramento boletim' },
  ];

  const waveBars = [3, 5, 4, 7, 9, 6, 4, 8, 11, 8, 5, 9, 12, 9, 6, 8, 10, 7, 4, 6, 9, 7, 5, 4, 6, 8, 3, 5, 7, 4];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes bol-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.8)} }
        .bol-dot { animation: bol-pulse 1s ease-in-out infinite; }
        @keyframes bol-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .bol-bar-a { animation: bol-wave 0.55s ease-in-out infinite; }
        .bol-bar-b { animation: bol-wave 0.7s ease-in-out infinite 0.12s; }
        .bol-bar-c { animation: bol-wave 0.45s ease-in-out infinite 0.25s; }
        .bol-bar-d { animation: bol-wave 0.8s ease-in-out infinite 0.08s; }
        @keyframes bol-ticker { 0%{transform:translateX(100%)} 100%{transform:translateX(-150%)} }
        .bol-ticker { animation: bol-ticker 12s linear infinite; white-space:nowrap; }
      `}</style>

      {/* Top header bar */}
      <div style={{ background: '#0d0d1f', borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>BOLETIM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#ff2222', borderRadius: 4, padding: '3px 8px' }}>
            <div className="bol-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', flexShrink: 0 }} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>AO VIVO</span>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
          <div style={{ color: '#555', fontSize: 9 }}>Boletim Noticioso</div>
        </div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Scrolling news ticker */}
      <div style={{ background: accent, overflow: 'hidden', height: 24, display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{ background: '#0d0d1f', padding: '0 10px', flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center' }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: 9, letterSpacing: 1 }}>URGENTE</span>
        </div>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <span className="bol-ticker" style={{ color: '#fff', fontSize: 11, fontWeight: 600, display: 'inline-block', paddingLeft: 20 }}>
            ★ ÚLTIMAS NOTÍCIAS ★ BOLETIM APRESENTADO POR {brand.toUpperCase()} ★ INFORMAÇÃO COM CREDIBILIDADE ★ FIQUE LIGADO ★
          </span>
        </div>
      </div>

      {/* Waveform visualizer */}
      <div style={{ background: '#0d0d1f', padding: '14px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 44, marginBottom: 6 }}>
          {waveBars.map((h, i) => {
            const classes = ['bol-bar-a', 'bol-bar-b', 'bol-bar-c', 'bol-bar-d'];
            const cls = classes[i % 4];
            const active = i < 18;
            return (
              <div
                key={i}
                className={active ? cls : ''}
                style={{
                  flex: 1,
                  height: h * 3.2,
                  background: active ? accent : '#1e1e3a',
                  borderRadius: 2,
                  transformOrigin: 'bottom',
                  opacity: active ? 1 : 0.4,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>● GRAVANDO</span>
          <span style={{ color: '#555', fontSize: 9 }}>0:30</span>
        </div>
      </div>

      {/* Sponsorship announcement card */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}35`, borderRadius: 10, padding: '14px 16px', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1a1a2e', padding: '0 10px' }}>
            <span style={{ color: accent, fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>PATROCÍNIO</span>
          </div>
          <div style={{ color: '#888', fontSize: 10, marginBottom: 4 }}>Boletim de Notícias</div>
          <div style={{ color: '#aaa', fontSize: 11, marginBottom: 2 }}>Apresentado por</div>
          <div style={{ color: accent, fontSize: 22, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>{brand}</div>
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${accent}60, transparent)`, margin: '8px 0' }} />
          <div style={{ color: '#666', fontSize: 10, fontStyle: 'italic' }}>"{headlineText}"</div>
        </div>
      </div>

      {/* Script — news blocks */}
      <div style={{ padding: '8px 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ROTEIRO DO BOLETIM</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {newsItems.map((n, i) => (
            <div key={i} style={{ background: '#0d0d1f', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accent}20` }}>
              <div style={{ display: 'flex', alignItems: 'stretch' }}>
                <div style={{ background: accent, padding: '8px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 42, flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 8 }}>{n.time}</span>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: 7, marginTop: 2 }}>{n.label}</span>
                </div>
                <div style={{ padding: '8px 12px', flex: 1 }}>
                  <div style={{ color: '#ccc', fontSize: 10, lineHeight: 1.4, marginBottom: 4 }}>{n.text}</div>
                  <div style={{ color: accent, fontSize: 8, fontWeight: 600 }}>{n.sfx}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script body */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 14px' }}>
          <div style={{ color: accent, fontSize: 8, fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>LOCUTOR</div>
          <p style={{ color: '#bbb', fontSize: 10, lineHeight: 1.7, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production specs */}
      <div style={{ padding: '0 18px 14px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'Formato', value: '"Apresentado por"' },
            { label: 'Duração', value: '30 segundos' },
            { label: 'Inserção', value: 'Abertura' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: `1px solid #2a2a4a`, borderRadius: 6, padding: '7px 10px', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 8, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 9, fontWeight: 700 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Station footer */}
      <div style={{ background: '#0d0d1f', borderTop: `1px solid #2a2a4a`, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2">
          <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
          <circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
        </svg>
        <span style={{ color: '#555', fontSize: 9 }}>Veiculação em rede nacional de emissoras</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
