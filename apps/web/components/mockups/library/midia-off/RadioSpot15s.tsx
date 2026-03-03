'use client';

import React from 'react';

interface RadioSpot15sProps {
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

export const RadioSpot15s: React.FC<RadioSpot15sProps> = ({
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
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Rápido, direto, impactante.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Spot de alta urgência com gancho imediato, benefício central e CTA direto ao ponto.';
  const accent = brandColor ?? '#7C3AED';

  const waveBars = [3, 5, 8, 12, 9, 14, 10, 7, 13, 11, 8, 6, 9, 12, 10, 7, 5, 8, 11, 9, 6, 4, 7, 10, 8, 5, 3];

  return (
    <div style={{ width: 400, fontFamily: 'system-ui, sans-serif', background: '#0d0a18', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes r15-wave { 0%,100%{scaleY:0.4} 50%{scaleY:1} }
        @keyframes r15-wave-a { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes r15-wave-b { 0%,100%{transform:scaleY(0.5)} 50%{transform:scaleY(0.8)} }
        @keyframes r15-wave-c { 0%,100%{transform:scaleY(0.2)} 50%{transform:scaleY(1)} }
        .r15-bar-a { animation: r15-wave-a 0.6s ease-in-out infinite; }
        .r15-bar-b { animation: r15-wave-b 0.7s ease-in-out infinite 0.1s; }
        .r15-bar-c { animation: r15-wave-c 0.5s ease-in-out infinite 0.2s; }
        .r15-bar-d { animation: r15-wave-a 0.8s ease-in-out infinite 0.3s; }
        .r15-bar-e { animation: r15-wave-b 0.6s ease-in-out infinite 0.15s; }
        @keyframes r15-urgent { 0%,100%{background:#EF4444} 50%{background:#DC2626} }
        .r15-urgent { animation: r15-urgent 0.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#150e28', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>RÁDIO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Spot de Rádio</div>
          <div style={{ color: '#888', fontSize: 10 }}>Urgência máxima • Alta frequência</div>
        </div>
        <div style={{ background: '#EF4444', borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: '#fff', fontWeight: 900, fontSize: 11 }}>15s</span>
        </div>
      </div>

      {/* Waveform visualizer */}
      <div style={{ background: '#0a0814', padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, height: 50, justifyContent: 'center' }}>
          {waveBars.map((h, i) => {
            const cls = i % 5 === 0 ? 'r15-bar-a' : i % 5 === 1 ? 'r15-bar-b' : i % 5 === 2 ? 'r15-bar-c' : i % 5 === 3 ? 'r15-bar-d' : 'r15-bar-e';
            const isActive = i > 6 && i < 20;
            return (
              <div
                key={i}
                className={isActive ? cls : ''}
                style={{
                  width: 4,
                  height: h * 2.5,
                  background: isActive ? accent : '#2a2a3a',
                  borderRadius: 2,
                  transformOrigin: 'center',
                  opacity: isActive ? 0.9 : 0.4,
                  transition: 'height 0.1s',
                }}
              />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ color: '#555', fontSize: 8 }}>0:00</span>
          <span style={{ color: accent, fontSize: 8, fontWeight: 700 }}>0:07 ▶</span>
          <span style={{ color: '#555', fontSize: 8 }}>0:15</span>
        </div>
      </div>

      {/* Script teleprompter box */}
      <div style={{ padding: '0 16px 12px', background: '#0a0814' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ROTEIRO — TELEPROMPTER</div>
        <div style={{ background: '#000', border: `1px solid ${accent}30`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '12px 14px', fontFamily: 'monospace', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 6, right: 8, display: 'flex', gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.6, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Duration + Format badge */}
      <div style={{ padding: '0 16px 10px', background: '#0a0814' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="r15-urgent" style={{ borderRadius: 6, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 10 }}>URGÊNCIA</span>
          </div>
          {[{ l: '15 segundos', c: accent }, { l: 'Off / Locução', c: '#3B82F6' }, { l: 'Alta freq.', c: '#10B981' }].map((b, i) => (
            <div key={i} style={{ background: `${b.c}15`, border: `1px solid ${b.c}40`, borderRadius: 6, padding: '5px 10px' }}>
              <span style={{ color: b.c, fontSize: 10, fontWeight: 600 }}>{b.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Voice + music specs */}
      <div style={{ padding: '0 16px 10px', background: '#0a0814' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '🎙️', label: 'Locutor', value: 'Masculino, energético' },
            { icon: '🎵', label: 'BG Music', value: 'Percussão intensa' },
            { icon: '🎭', label: 'Tom', value: 'Urgente / Direto' },
            { icon: '📢', label: 'CTA', value: 'Ação imediata' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1e1e30', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#555', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Radio station band strip */}
      <div style={{ background: '#000', borderTop: `1px solid ${accent}30`, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
        <div style={{ display: 'flex', gap: 8, flex: 1, overflowX: 'auto' }}>
          {['FM 89.1', 'FM 94.7', 'FM 100.9', 'AM 1030', 'AM 710'].map((freq, i) => (
            <div key={i} style={{ background: i === 0 ? accent : '#1a1a2a', borderRadius: 4, padding: '3px 8px', flexShrink: 0 }}>
              <span style={{ color: i === 0 ? '#fff' : '#666', fontSize: 9, fontWeight: 600 }}>{freq}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9, flexShrink: 0 }}>{brand}</span>
      </div>
    </div>
  );
};
