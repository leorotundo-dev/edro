'use client';

import React from 'react';

interface TVInstitucionalProps {
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

export const TVInstitucional: React.FC<TVInstitucionalProps> = ({
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
  brandColor = '#1E40AF',
}) => {
  const brand = brandName ?? name ?? 'Empresa';
  const headlineText = headline ?? title ?? 'Construindo um futuro melhor, juntos.';
  const bodyText = body ?? caption ?? description ?? text ?? 'Há mais de 30 anos transformando vidas com inovação, responsabilidade e compromisso com a sociedade.';
  const img = image ?? postImage ?? thumbnail;
  const accent = brandColor ?? '#1E40AF';

  const values = ['Inovação', 'Integridade', 'Impacto Social', 'Excelência'];

  return (
    <div style={{ width: 420, fontFamily: 'system-ui, sans-serif', background: '#080c14', borderRadius: 12, overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}>
      <style>{`
        @keyframes inst-fade { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .inst-val { animation: inst-fade 3s ease-in-out infinite; }
        .inst-val2 { animation: inst-fade 3s ease-in-out infinite 0.75s; }
        .inst-val3 { animation: inst-fade 3s ease-in-out infinite 1.5s; }
        .inst-val4 { animation: inst-fade 3s ease-in-out infinite 2.25s; }
      `}</style>

      {/* Header */}
      <div style={{ background: '#0a1020', borderBottom: `3px solid ${accent}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ background: accent, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 12 }}>INSTITUCIONAL</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#ccc', fontSize: 12 }}>Vídeo Institucional</div>
          <div style={{ color: '#888', fontSize: 10 }}>B2B • Branding corporativo</div>
        </div>
        <div style={{ background: '#0a1020', border: `1px solid ${accent}60`, borderRadius: 20, padding: '3px 10px' }}>
          <span style={{ color: accent, fontWeight: 700, fontSize: 11 }}>60s</span>
        </div>
      </div>

      {/* Hero visual */}
      <div style={{ position: 'relative', height: 110, background: `linear-gradient(135deg, #080c14 0%, ${accent}22 50%, #080c14 100%)`, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {img
          ? <img src={img} alt={brand} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, opacity: 0.35 }} />
          : null
        }
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${accent}15 1px, transparent 1px), linear-gradient(90deg, ${accent}15 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>{brand}</div>
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, marginTop: 6 }} />
          <div style={{ color: `${accent}cc`, fontSize: 10, fontWeight: 600, letterSpacing: 3, marginTop: 6, textTransform: 'uppercase' }}>Desde 1994</div>
        </div>
      </div>

      {/* Brand values */}
      <div style={{ padding: '12px 16px 10px', background: '#0a1020' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>VALORES DA EMPRESA</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {values.map((v, i) => (
            <div key={i} className={['inst-val', 'inst-val2', 'inst-val3', 'inst-val4'][i]} style={{ flex: 1, background: `${accent}15`, border: `1px solid ${accent}30`, borderRadius: 6, padding: '8px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>
                {['🌱', '🤝', '🌍', '⭐'][i]}
              </div>
              <div style={{ color: '#ccc', fontSize: 9, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Storyboard frames */}
      <div style={{ padding: '0 16px 10px', background: '#0a1020' }}>
        <div style={{ color: '#666', fontSize: 9, fontWeight: 600, letterSpacing: 1, marginBottom: 6 }}>ESTRUTURA DO VÍDEO</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'História', sub: '0–15s', bg: '#0d1525' },
            { label: 'Valores', sub: '15–35s', bg: '#0d1a25' },
            { label: 'Equipe', sub: '35–50s', bg: '#0d2010' },
            { label: 'Visão', sub: '50–60s', bg: '#1a1020' },
          ].map((f, i) => (
            <div key={i} style={{ flex: 1, background: '#111', border: '1px solid #1e2a40', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ height: 44, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={`${accent}60`} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div style={{ padding: '3px 5px', background: '#0a1020' }}>
                <span style={{ color: accent, fontSize: 8, fontWeight: 700, display: 'block' }}>{f.label}</span>
                <span style={{ color: '#555', fontSize: 8 }}>{f.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Script */}
      <div style={{ padding: '0 16px 12px', background: '#0a1020' }}>
        <div style={{ background: '#0d1525', border: `1px solid ${accent}20`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: '10px 12px' }}>
          <p style={{ color: '#e0e0e0', fontSize: 13, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{headlineText}"</p>
          <p style={{ color: '#888', fontSize: 11, lineHeight: 1.5, marginTop: 6, marginBottom: 0 }}>{bodyText}</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ padding: '0 16px 14px', background: '#0a1020' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {[
            { label: 'Anos de mercado', value: '30+' },
            { label: 'Clientes ativos', value: '50k' },
            { label: 'Países', value: '12' },
          ].map((k, i) => (
            <div key={i} style={{ background: '#0d1525', border: `1px solid ${accent}20`, borderRadius: 6, padding: '8px', textAlign: 'center' }}>
              <div style={{ color: accent, fontSize: 18, fontWeight: 900 }}>{k.value}</div>
              <div style={{ color: '#666', fontSize: 9 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#060a10', borderTop: `1px solid ${accent}20`, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Veiculação B2B</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ label: 'globo', color: '#f97316' }, { label: 'CNN', color: '#3b82f6' }, { label: 'GloboNews', color: '#ef4444' }, { label: 'Band', color: '#a855f7' }].map((ch, i) => (
            <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: '#111', border: `1.5px solid ${ch.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 5, fontWeight: 800, color: ch.color }}>{ch.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: '#555', fontSize: 9 }}>{brand}</span>
      </div>
    </div>
  );
};
