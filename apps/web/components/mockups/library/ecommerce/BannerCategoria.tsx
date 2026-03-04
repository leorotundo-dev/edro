'use client';
import React, { useState } from 'react';

interface BannerCategoriaProps {
  headline?: string; title?: string; name?: string; username?: string;
  body?: string; caption?: string; description?: string; text?: string;
  image?: string; postImage?: string; thumbnail?: string; profileImage?: string;
  brandColor?: string; brandName?: string;
}

export const BannerCategoria: React.FC<BannerCategoriaProps> = ({
  headline, title, name, username,
  body, caption, description, text,
  image: imageProp, postImage, thumbnail, profileImage,
  brandColor = '#E53E3E',
  brandName,
}) => {
  const [hoveredSub, setHoveredSub] = useState<number | null>(null);
  const mainTitle = headline ?? title ?? name ?? username ?? 'Moda Feminina';
  const sub = body ?? caption ?? description ?? text ?? 'Descubra as últimas tendências da estação';
  const brand = brandName ?? 'MINHA LOJA';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  const subcats = [
    { label: 'Vestidos', count: 128 },
    { label: 'Blusas', count: 97 },
    { label: 'Calças', count: 74 },
    { label: 'Acessórios', count: 53 },
  ];

  return (
    <div style={{
      position: 'relative', width: '700px', borderRadius: '16px', overflow: 'hidden',
      fontFamily: "'Segoe UI', Arial, sans-serif", boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
      background: '#111',
    }}>
      <style>{`
        @keyframes bcat-fade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bcat-pulse { 0%,100% { opacity:1; } 50% { opacity:0.65; } }
        .bcat-enter { animation: bcat-fade 0.55s ease both; }
        .bcat-pulse { animation: bcat-pulse 2s ease infinite; }
      `}</style>

      {/* Hero image area */}
      <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
        {image ? (
          <img src={image} alt={mainTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor}cc 0%, #1a1a2e 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 100%)' }} />
        {/* Breadcrumb */}
        <div style={{ position: 'absolute', top: '16px', left: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>Início</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>›</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px' }}>Feminino</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>›</span>
          <span style={{ color: '#fff', fontSize: '11px', fontWeight: 600 }}>{mainTitle}</span>
        </div>
        {/* Brand badge */}
        <div style={{ position: 'absolute', top: '16px', right: '20px', background: brandColor, borderRadius: '6px', padding: '4px 10px' }}>
          <span style={{ color: '#fff', fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>{brand}</span>
        </div>
        {/* Bottom text */}
        <div className="bcat-enter" style={{ position: 'absolute', bottom: '20px', left: '20px', right: '20px' }}>
          <h2 style={{ color: '#fff', fontSize: '28px', fontWeight: 900, margin: '0 0 4px', letterSpacing: '-0.5px' }}>{mainTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0 }}>{sub}</p>
        </div>
      </div>

      {/* Subcategory tiles */}
      <div style={{ background: '#1a1a1a', padding: '16px 20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {subcats.map((sc, i) => (
          <button key={sc.label} type="button" aria-label={`Ver categoria ${sc.label}`}
            onMouseEnter={() => setHoveredSub(i)} onMouseLeave={() => setHoveredSub(null)}
            style={{
              background: hoveredSub === i ? brandColor : 'rgba(255,255,255,0.07)',
              border: `1px solid ${hoveredSub === i ? brandColor : 'rgba(255,255,255,0.12)'}`,
              borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{sc.label}</span>
            <span style={{ color: hoveredSub === i ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{sc.count}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" aria-label="Ver todos os produtos desta categoria"
          style={{ background: brandColor, border: 'none', borderRadius: '8px', padding: '9px 20px', cursor: 'pointer', color: '#fff', fontSize: '13px', fontWeight: 700, letterSpacing: '0.3px', boxShadow: `0 4px 14px ${brandColor}55` }}>
          Ver todos
        </button>
      </div>

      {/* Stats bar */}
      <div style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', gap: '24px' }}>
        {[{ v: '352', l: 'produtos' }, { v: '4,8★', l: 'avaliação média' }, { v: 'Entrega rápida', l: 'em até 3 dias úteis' }].map(s => (
          <div key={s.l} style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>{s.v}</span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px' }}>{s.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
