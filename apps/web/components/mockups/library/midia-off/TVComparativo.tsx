'use client';

import React from 'react';

interface TVComparativoProps {
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

export const TVComparativo: React.FC<TVComparativoProps> = ({
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
  brandColor = '#10B981',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Compare. A escolha é óbvia.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Demonstração lado a lado evidenciando os diferenciais da marca versus concorrência genérica.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#10B981';

  const beforeItems = ['Demorado', 'Caro', 'Complicado', 'Sem suporte'];
  const afterItems = ['Instantâneo', 'Econômico', 'Simples', 'Suporte 24h'];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0f0f0f', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes comp-slide { 0%{transform:translateX(-4px)} 50%{transform:translateX(4px)} 100%{transform:translateX(-4px)} }
        .comp-arrow { animation: comp-slide 2s ease-in-out infinite; }
        @keyframes comp-check { 0%,100%{opacity:0.7} 50%{opacity:1} }
        .comp-check { animation: comp-check 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M18 4H6M18 12H6M18 20H6" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>
          <span style={{ color: '#000', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>COMPARATIVO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Comercial Comparativo</div>
          <div style={{ color: '#666', fontSize: 10 }}>Antes vs. Depois • Split screen</div>
        </div>
        <div style={{ background: '#2a2a2a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Split screen concept */}
      <div style={{ display: 'flex', height: 120, position: 'relative' }}>
        {/* Left — Before */}
        <div style={{ flex: 1, background: '#1a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderRight: '2px solid #333' }}>
          <div style={{ background: '#2a1a1a', borderRadius: 6, padding: '4px 10px' }}>
            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>ANTES</span>
          </div>
          {img
            ? <img src={img} alt="antes" style={{ width: 60, height: 50, objectFit: 'cover', borderRadius: 4, opacity: 0.5, filter: 'grayscale(80%)' }} />
            : <div style={{ width: 60, height: 50, background: '#2a2a2a', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              </div>
          }
          <span style={{ color: '#555', fontSize: 9 }}>Solução atual</span>
        </div>

        {/* Center divider arrow */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}>
          <div className="comp-arrow" style={{ background: accent, borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${accent}60` }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        {/* Right — After */}
        <div style={{ flex: 1, background: '#0a1a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, borderLeft: '2px solid #333' }}>
          <div style={{ background: '#0a2a0a', borderRadius: 6, padding: '4px 10px' }}>
            <span style={{ color: accent, fontSize: 10, fontWeight: 700 }}>DEPOIS</span>
          </div>
          <div style={{ width: 60, height: 50, background: `${accent}20`, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${accent}40` }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/></svg>
          </div>
          <span style={{ color: accent, fontSize: 9, fontWeight: 600 }}>{brand}</span>
        </div>
      </div>

      {/* Comparison table */}
      <div style={{ padding: '12px 16px 0', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 28px 1fr', gap: 4 }}>
          <div style={{ color: '#ef4444', fontSize: 9, fontWeight: 700, textAlign: 'center', marginBottom: 4, padding: '3px 0', background: '#2a1a1a', borderRadius: 4 }}>SEM {brand.toUpperCase()}</div>
          <div />
          <div style={{ color: accent, fontSize: 9, fontWeight: 700, textAlign: 'center', marginBottom: 4, padding: '3px 0', background: `${accent}15`, borderRadius: 4 }}>COM {brand.toUpperCase()}</div>
          {beforeItems.map((b, i) => (
            <React.Fragment key={i}>
              <div style={{ background: '#1e1212', borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                <span style={{ color: '#888', fontSize: 10 }}>{b}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 1, height: '100%', background: '#2a2a2a' }} />
              </div>
              <div className="comp-check" style={{ background: `${accent}10`, borderRadius: 4, padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, border: `1px solid ${accent}20` }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                <span style={{ color: '#ccc', fontSize: 10 }}>{afterItems[i]}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '12px 16px 10px', background: '#141414' }}>
        <div style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 4, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#141414' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Consumidores indecisos' },
            { icon: '🎭', label: 'Tom', value: 'Direto / Persuasivo' },
            { icon: '📢', label: 'CTA', value: 'Troca / Conversão' },
            { icon: '🎬', label: 'Formato', value: '30s • Split screen' },
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
