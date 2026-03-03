'use client';

import React from 'react';

interface TVSobrepostoProps {
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

export const TVSobreposto: React.FC<TVSobrepostoProps> = ({
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
  brandColor = '#3B82F6',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'Conheça. Ligue. Acesse agora.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Overlay gráfico inferior (L3 / lower third) com mensagem de marca durante programação ao vivo.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#3B82F6';

  const l3Variants = [
    { label: 'L3 Simples', desc: 'Texto + logo', active: false },
    { label: 'L3 Dupla linha', desc: 'Título + subtítulo', active: true },
    { label: 'L3 Com CTA', desc: 'Ação + contato', active: false },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0a0d14', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes l3-slide { 0%{transform:translateX(-8px);opacity:0} 10%{transform:translateX(0);opacity:1} 90%{transform:translateX(0);opacity:1} 100%{transform:translateX(8px);opacity:0} }
        .l3-slide { animation: l3-slide 4s ease-in-out infinite; }
        @keyframes l3-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .l3-blink { animation: l3-blink 1.2s step-end infinite; }
        @keyframes l3-scan { 0%{transform:translateX(-100%)} 100%{transform:translateX(600%)} }
        .l3-scan { animation: l3-scan 3s linear infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0f1420', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="2" y="14" width="20" height="6" rx="1"/><rect x="2" y="4" width="14" height="8" rx="1" opacity="0.5"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>SOBREPOSTO</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Lower Third / GC</div>
          <div style={{ color: '#888', fontSize: 10 }}>Overlay gráfico • Inserção ao vivo</div>
        </div>
        <div style={{ background: '#0f1420', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>GC</span>
        </div>
      </div>

      {/* TV screen mockup */}
      <div style={{ position: 'relative', height: 180, background: '#000', overflow: 'hidden' }}>
        {/* Background content (program) */}
        {img
          ? <img src={img} alt="programa" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }} />
          : <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0f1a24 0%, #1a1020 50%, #0a1418 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', opacity: 0.4 }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                <div style={{ color: '#888', fontSize: 9, marginTop: 4 }}>Conteúdo da programação</div>
              </div>
            </div>
        }

        {/* ON AIR badge */}
        <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '3px 8px' }}>
          <div className="l3-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ color: '#fff', fontSize: 8, fontWeight: 700 }}>AO VIVO</span>
        </div>

        {/* Scene number */}
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.6)', borderRadius: 3, padding: '2px 6px' }}>
          <span style={{ color: '#ccc', fontSize: 8 }}>Quadro 01 / 03</span>
        </div>

        {/* THE LOWER THIRD — defining element */}
        <div className="l3-slide" style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {/* Scan line above L3 */}
          <div style={{ height: 2, background: '#111', position: 'relative', overflow: 'hidden' }}>
            <div className="l3-scan" style={{ position: 'absolute', top: 0, width: 60, height: '100%', background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
          </div>
          {/* L3 band */}
          <div style={{ background: `linear-gradient(90deg, ${accent}ee, ${accent}cc)`, padding: '8px 16px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Brand marker */}
            <div style={{ width: 4, height: 36, background: '#fff', borderRadius: 2, flexShrink: 0, opacity: 0.8 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 900, letterSpacing: 0.5, lineHeight: 1.2 }}>{brand.toUpperCase()}</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, lineHeight: 1.3, marginTop: 2 }}>{headlineText}</div>
            </div>
            {/* Logo area */}
            <div style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, width: 48, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontSize: 9, fontWeight: 800 }}>LOGO</span>
            </div>
          </div>
          {/* Shadow strip */}
          <div style={{ height: 6, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)' }} />
        </div>
      </div>

      {/* L3 variant selector */}
      <div style={{ padding: '12px 16px 8px', background: '#0f1420' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>VARIAÇÕES DE LOWER THIRD</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {l3Variants.map((v, i) => (
            <div key={i} style={{ background: v.active ? `${accent}15` : '#111', border: `1px solid ${v.active ? accent + '60' : '#1e1e1e'}`, borderRadius: 6, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.active ? accent : '#333', flexShrink: 0 }} />
              <span style={{ color: v.active ? accent : '#888', fontSize: 11, fontWeight: v.active ? 700 : 400 }}>{v.label}</span>
              <span style={{ color: '#555', fontSize: 9, marginLeft: 'auto' }}>{v.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0f1420' }}>
        <div style={{ background: '#111', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, margin: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Specs grid */}
      <div style={{ padding: '0 16px 14px', background: '#0f1420' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '📺', label: 'Formato', value: 'Lower Third (L3)' },
            { icon: '⏱️', label: 'Duração', value: '8–12s por exibição' },
            { icon: '🎨', label: 'Overlay', value: 'Fundo sólido/gradiente' },
            { icon: '🔁', label: 'Frequência', value: 'Rotativo ao vivo' },
          ].map((d, i) => (
            <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: 6, padding: '7px 10px' }}>
              <span style={{ fontSize: 13 }}>{d.icon}</span>
              <div style={{ color: '#555', fontSize: 9, marginTop: 2 }}>{d.label}</div>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600 }}>{d.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#060810', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'SBT', color: '#3b82f6' }, { label: 'REC', color: '#ef4444' }, { label: 'BAND', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 6, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
