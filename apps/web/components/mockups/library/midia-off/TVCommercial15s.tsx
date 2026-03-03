'use client';

import React from 'react';

interface TVCommercial15sProps {
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

export const TVCommercial15s: React.FC<TVCommercial15sProps> = ({
  name,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor = '#E53E3E',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Chamada rápida. Impacto imediato.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Mensagem direta ao ponto. Sem enrolação. Só o essencial para converter.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#E53E3E';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes tv15-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .tv15-blink { animation: tv15-blink 1.2s ease-in-out infinite; }
        @keyframes tv15-bar { 0%{transform:scaleY(0.4)} 50%{transform:scaleY(1)} 100%{transform:scaleY(0.4)} }
        .tv15-bar1 { animation: tv15-bar 0.7s ease-in-out infinite; }
        .tv15-bar2 { animation: tv15-bar 0.9s ease-in-out infinite 0.1s; }
        .tv15-bar3 { animation: tv15-bar 0.6s ease-in-out infinite 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>TV</span>
        </div>
        <span style={{ color: '#ccc', fontSize: 12, flex: 1 }}>Comercial de Televisão</span>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="tv15-blink" style={{ width: 6, height: 6, background: accent, borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>15s</span>
        </div>
        <div style={{ background: '#333', borderRadius: 4, padding: '2px 8px' }}>
          <span style={{ color: '#aaa', fontSize: 10, fontWeight: 600 }}>CHAMADA RÁPIDA</span>
        </div>
      </div>

      {/* Storyboard frames */}
      <div style={{ padding: '14px 16px 0', background: '#141414' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {[
            { n: '01', label: 'Abertura', sublabel: '0–5s' },
            { n: '02', label: 'Produto', sublabel: '5–12s' },
            { n: '03', label: 'CTA', sublabel: '12–15s' },
          ].map((frame, i) => (
            <div key={i} style={{ flex: 1, background: '#222', borderRadius: 6, overflow: 'hidden', border: '1px solid #333', position: 'relative' }}>
              {i === 1 && img
                ? <img src={img} alt="frame" style={{ width: '100%', height: 72, objectFit: 'cover', display: 'block' }} />
                : <div style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: i === 0 ? '#1a1a2e' : i === 2 ? '#1a2e1a' : '#222' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </div>
              }
              <div style={{ padding: '4px 6px', background: '#1a1a1a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: accent, fontSize: 9, fontWeight: 700 }}>#{frame.n}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{frame.sublabel}</span>
                </div>
                <span style={{ color: '#aaa', fontSize: 10 }}>{frame.label}</span>
              </div>
            </div>
          ))}
        </div>
        {/* Playback bar */}
        <div style={{ height: 3, background: '#2a2a2a', borderRadius: 2, marginBottom: 14, position: 'relative' }}>
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(90deg, ${accent} 0%, ${accent} 100%)`, borderRadius: 2 }} />
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', width: 8, height: 8, background: accent, borderRadius: '50%' }} />
        </div>
      </div>

      {/* Script section */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span style={{ color: '#888', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>ROTEIRO / LOCUTOR</span>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.6, margin: 0 }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Adultos 25–45' },
            { icon: '🎭', label: 'Tom', value: 'Impactante / Urgente' },
            { icon: '📢', label: 'CTA', value: 'Ação imediata' },
            { icon: '🎬', label: 'Formato', value: '15s • Chamada rápida' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '8px 10px' }}>
              <span style={{ fontSize: 14 }}>{d.icon}</span>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 11, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer — broadcaster logos */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação prevista</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[
            { label: 'globo', color: '#f97316' },
            { label: 'SBT', color: '#3b82f6' },
            { label: 'REC', color: '#ef4444' },
            { label: 'BAND', color: '#a855f7' },
          ].map((ch, i) => (
            <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
