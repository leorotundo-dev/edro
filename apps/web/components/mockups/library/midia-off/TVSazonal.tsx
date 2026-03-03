'use client';

import React from 'react';

interface TVSazonalProps {
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

export const TVSazonal: React.FC<TVSazonalProps> = ({
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
  brandColor = '#F59E0B',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const headlineText = headline ?? title ?? 'A estação chegou. As ofertas também.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Campanha sazonal com identidade visual temática e ofertas exclusivas para celebrar esta época do ano.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#F59E0B';

  const seasons = [
    { id: 'verão', icon: '☀️', color: '#F59E0B', months: 'Dez–Fev', active: true },
    { id: 'outono', icon: '🍂', color: '#D97706', months: 'Mar–Mai', active: false },
    { id: 'inverno', icon: '❄️', color: '#60A5FA', months: 'Jun–Ago', active: false },
    { id: 'primavera', icon: '🌸', color: '#EC4899', months: 'Set–Nov', active: false },
  ];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#0a0f0a', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
      <style>{`
        @keyframes saz-float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-5px)} }
        .saz-float { animation: saz-float 3s ease-in-out infinite; }
        .saz-float2 { animation: saz-float 3s ease-in-out infinite 0.7s; }
        .saz-float3 { animation: saz-float 3s ease-in-out infinite 1.4s; }
        @keyframes saz-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        .saz-shimmer { animation: saz-shimmer 3s linear infinite; background: linear-gradient(90deg, ${accent}30, ${accent}80, ${accent}30); background-size: 200%; }
        @keyframes saz-badge { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .saz-badge { animation: saz-badge 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0f150a', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12 }}>☀️</span>
          <span style={{ color: '#000', fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>SAZONAL</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Campanha Sazonal TV</div>
          <div style={{ color: '#888', fontSize: 10 }}>Temática • Data comemorativa</div>
        </div>
        <div style={{ background: '#1a1a0a', border: `1px solid ${accent}`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>30s</span>
        </div>
      </div>

      {/* Season selector tabs */}
      <div style={{ background: '#0a1008', padding: '10px 16px' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 7 }}>ESTAÇÃO DA CAMPANHA</div>
        <div style={{ display: 'flex', gap: 5 }}>
          {seasons.map((s, i) => (
            <div key={i} style={{ flex: 1, background: s.active ? `${s.color}18` : '#111', border: `1px solid ${s.active ? s.color : '#222'}`, borderRadius: 8, padding: '7px 5px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ color: s.active ? s.color : '#555', fontSize: 8, fontWeight: 700, textTransform: 'capitalize' }}>{s.id}</div>
              <div style={{ color: '#444', fontSize: 7 }}>{s.months}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Hero visual */}
      <div style={{ position: 'relative', height: 110, margin: '0 16px 10px', borderRadius: 8, overflow: 'hidden', border: `1px solid ${accent}30` }}>
        {img
          ? <img src={img} alt="sazonal" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
          : <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, #0a1508 0%, ${accent}12 50%, #0a1508 100%)` }} />
        }
        {/* Floating decorative elements */}
        <div className="saz-float" style={{ position: 'absolute', top: 10, left: 18, fontSize: 22, opacity: 0.8 }}>☀️</div>
        <div className="saz-float2" style={{ position: 'absolute', top: 28, right: 24, fontSize: 14, opacity: 0.6 }}>✨</div>
        <div className="saz-float3" style={{ position: 'absolute', bottom: 18, left: 55, fontSize: 11, opacity: 0.5 }}>🌿</div>
        <div className="saz-float" style={{ position: 'absolute', bottom: 22, right: 48, fontSize: 18, opacity: 0.7, animationDelay: '1.5s' }}>⭐</div>
        {/* Center card */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="saz-badge" style={{ background: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: '10px 20px', textAlign: 'center', border: `1px solid ${accent}40` }}>
            <div style={{ color: accent, fontSize: 18, fontWeight: 900, letterSpacing: 1 }}>{brand}</div>
            <div style={{ color: '#ccc', fontSize: 10, marginTop: 2 }}>Coleção Verão 2025</div>
          </div>
        </div>
        {/* Period badge */}
        <div style={{ position: 'absolute', top: 8, right: 8, background: accent, borderRadius: 4, padding: '3px 8px' }}>
          <span style={{ color: '#000', fontSize: 8, fontWeight: 700 }}>Dez–Fev</span>
        </div>
      </div>

      {/* Storyboard */}
      <div style={{ padding: '0 16px 10px', background: '#0a1008' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>STORYBOARD — 3 FRAMES</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: '01', label: 'Cenário', sub: '0–10s', desc: 'Ambientação sazonal' },
            { n: '02', label: 'Produto', sub: '10–22s', desc: 'Oferta temática' },
            { n: '03', label: 'Marca', sub: '22–30s', desc: 'CTA + assinatura' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#111', border: `1px solid ${i === 1 ? accent + '60' : '#222'}`, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 46, background: i === 1 ? `${accent}15` : '#0a1008', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {i === 1
                  ? <span style={{ fontSize: 20 }}>☀️</span>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${accent}40`} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                }
              </div>
              <div style={{ padding: '4px 5px', background: '#0a0d08' }}>
                <span style={{ color: i === 1 ? accent : '#888', fontSize: 8, fontWeight: 700, display: 'block' }}>#{f.n} {f.label}</span>
                <span style={{ color: '#555', fontSize: 8, display: 'block' }}>{f.sub}</span>
                <span style={{ color: '#444', fontSize: 7 }}>{f.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seasonal dates highlight */}
      <div style={{ padding: '0 16px 10px', background: '#0a1008' }}>
        <div style={{ background: '#111', border: `1px solid ${accent}20`, borderRadius: 6, padding: '8px 12px' }}>
          <div className="saz-shimmer" style={{ height: 2, borderRadius: 1, marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-around' }}>
            {['Natal', 'Réveillon', 'Carnaval', 'Páscoa'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ color: i === 0 ? accent : '#555', fontSize: 10, fontWeight: 700 }}>{d}</div>
                <div style={{ color: '#444', fontSize: 8 }}>{i === 0 ? 'Ativo' : 'Futuro'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0a1008' }}>
        <div style={{ background: '#111', border: `1px solid #1a1a1a`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* Production details */}
      <div style={{ padding: '0 16px 14px', background: '#0a1008' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: '👥', label: 'Público-alvo', value: 'Consumidores sazonais' },
            { icon: '🎭', label: 'Tom', value: 'Festivo / Emocional' },
            { icon: '📅', label: 'Período', value: 'Dez–Fev' },
            { icon: '🎬', label: 'Formato', value: '30s • Temático sazonal' },
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
      <div style={{ background: '#060a06', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
