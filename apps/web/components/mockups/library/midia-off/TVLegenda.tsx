'use client';

import React from 'react';

interface TVLegendaProps {
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

export const TVLegenda: React.FC<TVLegendaProps> = ({
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
  brandColor = '#6366F1',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Acessível para todos. Inclusão é essencial.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Comercial com legendas e audiodescrição, garantindo acessibilidade e alcance a todos os públicos.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#6366F1';

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes leg-cursor { 0%,100%{opacity:1} 50%{opacity:0} }
        .leg-cursor { animation: leg-cursor 1s step-end infinite; }
        @keyframes leg-scan { 0%{transform:translateX(-100%)} 100%{transform:translateX(500%)} }
        .leg-scan { animation: leg-scan 4s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4" stroke="white" strokeWidth="2" fill="none"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>TV</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial com Legendas</div>
          <div style={{ color: '#888', fontSize: 10 }}>Acessibilidade • Audiodescrição • LIBRAS</div>
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Accessibility badges */}
      <div style={{ background: '#141414', padding: '8px 16px', display: 'flex', gap: 6 }}>
        {[
          { icon: '💬', label: 'Legendas', color: accent },
          { icon: '🔊', label: 'Audiodescrição', color: '#10B981' },
          { icon: '🤟', label: 'LIBRAS', color: '#F59E0B' },
          { icon: '♿', label: 'Inclusivo', color: '#EC4899' },
        ].map((b, i) => (
          <div key={i} style={{ background: '#1e1e1e', border: `1px solid ${b.color}40`, borderRadius: 6, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}>
            <span style={{ fontSize: 12 }}>{b.icon}</span>
            <span style={{ color: b.color, fontSize: 8, fontWeight: 600 }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Frame preview — with subtitle bar */}
      <div style={{ position: 'relative', margin: '0 16px 10px', borderRadius: 8, overflow: 'hidden', border: '1px solid #333' }}>
        {/* Main content area */}
        {img
          ? <img src={img} alt="frame" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
          : <div style={{ height: 110, background: 'linear-gradient(135deg, #1a1a2e, #0a1a1a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={`${accent}60`} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </div>
        }
        {/* Storyboard frames overlay at top */}
        <div style={{ position: 'absolute', top: 6, left: 6, display: 'flex', gap: 4 }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ width: 28, height: 20, background: 'rgba(0,0,0,0.7)', border: `1px solid ${accent}50`, borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: accent, fontSize: 8, fontWeight: 700 }}>{n}</span>
            </div>
          ))}
        </div>
        {/* Subtitle bar — the defining feature */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.85)', padding: '6px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#fff', fontSize: 12, lineHeight: 1.4, flex: 1 }}>"{headlineText}"<span className="leg-cursor" style={{ color: accent }}>|</span></span>
          </div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#2a2a2a', overflow: 'hidden' }}>
            <div className="leg-scan" style={{ position: 'absolute', top: 0, left: 0, width: 40, height: '100%', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
          </div>
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span style={{ color: '#888', fontSize: 10, fontWeight: 600, letterSpacing: 0.5 }}>ROTEIRO / LEGENDA</span>
          </div>
          <p style={{ color: '#e0e0e0', fontSize: 12, lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Accessibility specs */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Todos os públicos' },
            { icon: '🎭', label: 'Tom', value: 'Inclusivo / Acolhedor' },
            { icon: '📺', label: 'Norma', value: 'ABNT NBR 15290' },
            { icon: '🎬', label: 'Formato', value: '30s + legenda integral' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', borderTop: '1px solid #222', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#1e1e1e', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
