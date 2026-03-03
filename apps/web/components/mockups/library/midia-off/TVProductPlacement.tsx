'use client';

import React from 'react';

interface TVProductPlacementProps {
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

export const TVProductPlacement: React.FC<TVProductPlacementProps> = ({
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
  brandColor = '#EC4899',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Seu produto integrado ao enredo.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Inserção orgânica do produto no roteiro da atração, com integração natural entre conteúdo e publicidade.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#EC4899';

  const placements = [
    { scene: 'Cena 03', program: 'Série Original', type: 'Uso em cena', duration: '12s' },
    { scene: 'Cena 11', program: 'Série Original', type: 'Menção verbal', duration: '5s' },
    { scene: 'Cena 18', program: 'Série Original', type: 'Close produto', duration: '8s' },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes pp-highlight { 0%,100%{box-shadow:0 0 0 2px ${accent}40} 50%{box-shadow:0 0 0 4px ${accent}80} }
        .pp-highlight { animation: pp-highlight 2s ease-in-out infinite; }
        @keyframes pp-tag { 0%{transform:scale(1)} 50%{transform:scale(1.05)} 100%{transform:scale(1)} }
        .pp-tag { animation: pp-tag 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7" stroke="white" strokeWidth="2.5"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 10 }}>PRODUCT PLACEMENT</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Inserção de Produto</div>
          <div style={{ color: '#888', fontSize: 10 }}>Branded content • Integração editorial</div>
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>Cena</span>
        </div>
      </div>

      {/* TV screenshot mockup with product highlight */}
      <div style={{ position: 'relative', background: '#000', margin: '0 0 0 0' }}>
        <div style={{ position: 'relative', height: 140, background: 'linear-gradient(135deg, #1a1a2e 0%, #0a1a0a 100%)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {img
            ? <img src={img} alt="cena" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            : (
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                {/* Simulated actors */}
                <div style={{ width: 50, height: 80, background: '#2a2a2a', borderRadius: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#444' }} />
                </div>
                {/* Product highlighted */}
                <div className="pp-highlight" style={{ width: 40, height: 55, background: `${accent}30`, border: `2px solid ${accent}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  {/* Tag pointing to product */}
                  <div className="pp-tag" style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', background: accent, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
                    <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>{brand}</span>
                  </div>
                  <div style={{ position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)', width: 1, height: 6, background: accent }} />
                </div>
                <div style={{ width: 50, height: 80, background: '#2a2a2a', borderRadius: 4, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#444' }} />
                </div>
              </div>
            )
          }
          {/* Overlay: scene info */}
          <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1z"/></svg>
            <span style={{ color: '#aaa', fontSize: 9 }}>Série Original — Ep. 04</span>
          </div>
          <div style={{ position: 'absolute', bottom: 8, right: 8, background: accent, borderRadius: 4, padding: '2px 8px' }}>
            <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>PRODUTO EM CENA</span>
          </div>
        </div>
      </div>

      {/* Placement schedule */}
      <div style={{ padding: '12px 16px 8px', background: '#141414' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>PLANO DE INSERÇÕES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {placements.map((p, i) => (
            <div key={i} style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderRadius: 6, padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{p.scene}</span>
                <span style={{ color: '#555', fontSize: 9, marginLeft: 8 }}>{p.program}</span>
              </div>
              <span style={{ background: `${accent}20`, color: accent, fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>{p.type}</span>
              <span style={{ color: '#666', fontSize: 9 }}>{p.duration}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Specs */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '📺', label: 'Formato', value: 'Product Placement' },
            { icon: '🎭', label: 'Integração', value: 'Roteiro orgânico' },
            { icon: '👁️', label: 'Exposição', value: 'Alta visibilidade' },
            { icon: '📊', label: 'Recall', value: '+60% vs. spot' },
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
