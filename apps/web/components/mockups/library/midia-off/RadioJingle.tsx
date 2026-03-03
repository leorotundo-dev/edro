'use client';

import React from 'react';

interface RadioJingleProps {
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

export const RadioJingle: React.FC<RadioJingleProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#EC4899',
}) => {
  const brand = brandName ?? name ?? 'Pizzaria Bella Napoli';
  const headlineText = headline ?? title ?? 'Bella Napoli — Sabor que canta!';
  const bodyText = body ?? caption ?? description ?? text ?? '♪ Na Bella Napoli você vai encontrar / A melhor pizza que você vai provar / Ingredientes frescos, forno a lenha também / Bella Napoli, gostoso assim não tem! ♪';
  const accent = brandColor ?? '#EC4899';

  const waveBars = [4, 7, 6, 9, 11, 8, 6, 10, 13, 9, 7, 11, 8, 12, 9, 7, 10, 8, 6, 9, 11, 7, 8, 6, 9];

  const songStructure = [
    { section: 'INTRO', duration: '0:00–0:04', bars: 4, desc: 'Acordes de abertura — animados, catchy' },
    { section: 'VERSO', duration: '0:04–0:14', bars: 8, desc: 'Melodia principal — letra da marca' },
    { section: 'REFRÃO', duration: '0:14–0:22', bars: 8, desc: 'Hook memorável — nome da marca em destaque' },
    { section: 'REPRISE', duration: '0:22–0:30', bars: 4, desc: 'Repetição do refrão + assinatura sonora' },
  ];

  const notePositions = [2, 5, 3, 6, 4, 7, 5, 3, 6, 4, 7, 5];

  return (
    <div style={{ width: 440, fontFamily: "'Inter', system-ui, sans-serif", background: '#1a1a2e', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', border: '1px solid #2a2a4a' }}>
      <style>{`
        @keyframes jin-wave { 0%,100%{transform:scaleY(0.25)} 50%{transform:scaleY(1)} }
        .jin-bar-a { animation: jin-wave 0.45s ease-in-out infinite; }
        .jin-bar-b { animation: jin-wave 0.58s ease-in-out infinite 0.1s; }
        .jin-bar-c { animation: jin-wave 0.38s ease-in-out infinite 0.2s; }
        .jin-bar-d { animation: jin-wave 0.65s ease-in-out infinite 0.05s; }
        @keyframes jin-note { 0%{transform:translateY(0) rotate(-10deg);opacity:1} 100%{transform:translateY(-18px) rotate(10deg);opacity:0} }
        .jin-note { animation: jin-note 1.8s ease-in-out infinite; }
        .jin-note-b { animation: jin-note 1.8s ease-in-out infinite 0.6s; }
        .jin-note-c { animation: jin-note 1.8s ease-in-out infinite 1.2s; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, #1f0014 0%, #0d0d1f 100%)`, borderBottom: `3px solid ${accent}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '5px 12px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: 1 }}>JINGLE</span>
        </div>
        <div style={{ background: '#1f0014', border: `1px solid ${accent}40`, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 10 }}>MUSICAL</span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>98.7 FM</div>
        <div style={{ background: '#111', border: `2px solid ${accent}`, borderRadius: 20, padding: '4px 12px', marginLeft: 8 }}>
          <span style={{ color: accent, fontWeight: 800, fontSize: 12 }}>30s</span>
        </div>
      </div>

      {/* Musical hero with floating notes */}
      <div style={{ background: `linear-gradient(180deg, #1f0014 0%, #0d0d1f 100%)`, padding: '18px 18px 14px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: `radial-gradient(ellipse at 50% 0%, ${accent}18 0%, transparent 70%)` }} />

        {/* Floating music notes */}
        <div style={{ position: 'absolute', top: 10, left: 20 }}>
          <span className="jin-note" style={{ color: accent, fontSize: 18, opacity: 0.7 }}>♪</span>
        </div>
        <div style={{ position: 'absolute', top: 6, right: 30 }}>
          <span className="jin-note-b" style={{ color: accent, fontSize: 24, opacity: 0.6 }}>♫</span>
        </div>
        <div style={{ position: 'absolute', top: 18, right: 80 }}>
          <span className="jin-note-c" style={{ color: accent, fontSize: 14, opacity: 0.5 }}>♩</span>
        </div>

        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ color: '#666', fontSize: 9, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>JINGLE PUBLICITÁRIO</div>
          <div style={{ color: '#fff', fontSize: 19, fontWeight: 900, lineHeight: 1.2, marginBottom: 6 }}>{headlineText}</div>
          <div style={{ color: accent, fontSize: 11, fontWeight: 600, marginBottom: 14 }}>para {brand}</div>

          {/* Musical staff simulation */}
          <div style={{ background: '#0a0a18', border: `1px solid ${accent}30`, borderRadius: 8, padding: '10px 14px', position: 'relative' }}>
            {[0, 1, 2, 3, 4].map(line => (
              <div key={line} style={{ height: 1, background: `${accent}25`, marginBottom: line < 4 ? 6 : 0 }} />
            ))}
            <div style={{ position: 'absolute', top: 4, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', alignItems: 'center', paddingInline: 8 }}>
              {notePositions.map((pos, i) => (
                <div key={i} style={{ position: 'relative', top: pos * 2 }}>
                  <span style={{ color: accent, fontSize: 10, fontWeight: 900 }}>♪</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#0d0d1f', padding: '8px 18px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
          {waveBars.map((h, i) => {
            const clsArr = ['jin-bar-a', 'jin-bar-b', 'jin-bar-c', 'jin-bar-d'];
            const cls = clsArr[i % 4];
            return (
              <div key={i} className={cls}
                style={{ flex: 1, height: h * 2.2, background: accent, borderRadius: 2, transformOrigin: 'bottom' }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 9 }}>0:00</span>
          <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>♫ REPRODUZINDO</span>
          <span style={{ color: '#555', fontSize: 9 }}>0:30</span>
        </div>
      </div>

      {/* Lyrics */}
      <div style={{ padding: '10px 18px 8px', background: '#1a1a2e' }}>
        <div style={{ background: '#0d0d1f', border: `1px solid ${accent}30`, borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, marginBottom: 6 }}>LETRA DO JINGLE</div>
          <p style={{ color: '#ddd', fontSize: 11, lineHeight: 1.9, margin: 0, fontStyle: 'italic', textAlign: 'center' }}>{bodyText}</p>
        </div>
      </div>

      {/* Song structure */}
      <div style={{ padding: '0 18px 10px', background: '#1a1a2e' }}>
        <div style={{ color: '#555', fontSize: 9, fontWeight: 700, letterSpacing: 2, marginBottom: 8 }}>ESTRUTURA MUSICAL</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {songStructure.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#0d0d1f', borderRadius: 6, padding: '7px 10px', border: `1px solid ${i === 2 ? accent + '40' : '#2a2a4a'}` }}>
              <div style={{ background: i === 2 ? accent : `${accent}25`, borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>
                <span style={{ color: i === 2 ? '#fff' : accent, fontSize: 8, fontWeight: 800 }}>{s.section}</span>
              </div>
              <span style={{ color: '#555', fontSize: 8, minWidth: 70, flexShrink: 0 }}>{s.duration}</span>
              <span style={{ color: '#999', fontSize: 9, flex: 1 }}>{s.desc}</span>
              <span style={{ color: '#444', fontSize: 8 }}>{s.bars} comp.</span>
            </div>
          ))}
        </div>
      </div>

      {/* Metadata */}
      <div style={{ padding: '0 18px 12px', background: '#1a1a2e' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {[
            { label: 'BPM', value: '128' },
            { label: 'Tonalidade', value: 'Dó Maior' },
            { label: 'Duração', value: '0:30' },
            { label: 'Estilo', value: 'Pop/Jingle' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d0d1f', border: '1px solid #2a2a4a', borderRadius: 6, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ color: '#555', fontSize: 7, marginBottom: 2 }}>{d.label}</div>
              <div style={{ color: accent, fontSize: 10, fontWeight: 800 }}>{d.value}</div>
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
        <span style={{ color: '#555', fontSize: 9 }}>{brand} — Jingle publicitário 30s</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>98.7 FM</span>
      </div>
    </div>
  );
};
