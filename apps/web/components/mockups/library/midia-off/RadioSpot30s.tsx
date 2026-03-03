'use client';

import React from 'react';

interface RadioSpot30sProps {
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

export const RadioSpot30s: React.FC<RadioSpot30sProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor = '#2563EB',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'A solução que você precisava está aqui.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Spot padrão com estrutura narrativa completa: gancho de atenção, apresentação do benefício central e chamada clara para ação.';
  const accent = brandColor ?? '#2563EB';

  const structure = [
    { label: 'Gancho', time: '0–8s', desc: 'Atenção imediata', icon: '🎣' },
    { label: 'Benefício', time: '8–22s', desc: 'Proposta de valor', icon: '💡' },
    { label: 'CTA', time: '22–30s', desc: 'Chamada para ação', icon: '📢' },
  ];

  const waveBars = [2, 4, 6, 9, 11, 14, 12, 10, 13, 15, 12, 9, 11, 14, 13, 10, 8, 11, 13, 10, 8, 6, 9, 11, 8, 5, 3, 5, 8, 6];

  return (
    <div style={{ width: 400, fontFamily: 'system-ui, sans-serif', background: '#08101a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes r30-wave-a { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes r30-wave-b { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(0.85)} }
        @keyframes r30-wave-c { 0%,100%{transform:scaleY(0.2)} 50%{transform:scaleY(0.95)} }
        .r30-bar-a { animation: r30-wave-a 0.7s ease-in-out infinite; }
        .r30-bar-b { animation: r30-wave-b 0.8s ease-in-out infinite 0.15s; }
        .r30-bar-c { animation: r30-wave-c 0.6s ease-in-out infinite 0.3s; }
        .r30-bar-d { animation: r30-wave-a 0.9s ease-in-out infinite 0.1s; }
        .r30-bar-e { animation: r30-wave-b 0.65s ease-in-out infinite 0.2s; }
        @keyframes r30-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        .r30-cursor { animation: r30-cursor 1s step-end infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0d1828', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>RÁDIO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Spot de Rádio — 30 Segundos</div>
          <div style={{ color: '#888', fontSize: 10 }}>Formato padrão • Narrativa completa</div>
        </div>
        <div style={{ background: '#0d1828', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 900, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Waveform */}
      <div style={{ background: '#060e18', padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 56, justifyContent: 'center' }}>
          {waveBars.map((h, i) => {
            const cls = i % 5 === 0 ? 'r30-bar-a' : i % 5 === 1 ? 'r30-bar-b' : i % 5 === 2 ? 'r30-bar-c' : i % 5 === 3 ? 'r30-bar-d' : 'r30-bar-e';
            const isActive = i > 4 && i < 24;
            const isCurrent = i === 14;
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                <div className={isActive ? cls : ''} style={{ width: 4, height: h * 2.4, background: isCurrent ? '#fff' : isActive ? accent : '#1a2a3a', borderRadius: 2, transformOrigin: 'center', opacity: isActive ? 0.9 : 0.3 }} />
                <div className={isActive ? cls : ''} style={{ width: 4, height: h * 2.4, background: isCurrent ? '#fff' : isActive ? `${accent}60` : '#1a2a3a', borderRadius: 2, transformOrigin: 'center', opacity: isActive ? 0.4 : 0.15, transform: 'scaleY(-1)' }} />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 8 }}>0:00</span>
          <span style={{ color: accent, fontSize: 8, fontWeight: 700 }}>0:15 ▶</span>
          <span style={{ color: '#555', fontSize: 8 }}>0:30</span>
        </div>
      </div>

      {/* Narrative structure */}
      <div style={{ padding: '0 16px 10px', background: '#060e18' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ESTRUTURA NARRATIVA</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {structure.map((s, i) => (
            <div key={i} style={{ flex: i === 1 ? 2 : 1, background: i === 1 ? `${accent}15` : '#0d1828', border: `1px solid ${i === 1 ? accent + '50' : '#1a2a3a'}`, borderRadius: 8, padding: '8px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ color: i === 1 ? accent : '#888', fontSize: 10, fontWeight: 700 }}>{s.label}</div>
              <div style={{ color: '#555', fontSize: 8 }}>{s.time}</div>
              <div style={{ color: '#444', fontSize: 7, marginTop: 2 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Script teleprompter */}
      <div style={{ padding: '0 16px 12px', background: '#060e18' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ROTEIRO — TELEPROMPTER</div>
        <div style={{ background: '#000', border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '12px 14px', fontFamily: 'monospace' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>"{headlineText}"<span className="r30-cursor" style={{ color: accent }}>|</span></p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Voice + music specs */}
      <div style={{ padding: '0 16px 10px', background: '#060e18' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '🎙️', label: 'Locutor', value: 'Neutro, cálido' },
            { icon: '🎵', label: 'BG Music', value: 'Suave, instrumental' },
            { icon: '🎭', label: 'Tom', value: 'Persuasivo / Amigável' },
            { icon: '📢', label: 'CTA', value: 'Ligue / Acesse / Vá' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#0d1828', border: '1px solid #1a2a3a', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#555', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radio station band strip */}
      <div style={{ background: '#000', borderTop: `1px solid ${accent}30`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {['FM 89.1', 'FM 94.7', 'FM 100.9', 'AM 1030', 'AM 710'].map((freq, i) => (
            <div key={i} style={{ background: i === 0 ? accent : '#1a1a2a', borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>
              <span style={{ color: i === 0 ? '#fff' : '#666', fontSize: 9, fontWeight: 600 }}>{freq}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
