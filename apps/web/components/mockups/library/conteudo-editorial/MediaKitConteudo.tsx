'use client';

import React from 'react';

interface MediaKitConteudoProps {
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

export const MediaKitConteudo: React.FC<MediaKitConteudoProps> = ({
  name,
  username,
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
  profileImage,
  brandColor = '#1e1b4b',
}) => {
  const resolvedBrand = brandName || name || username || 'Marca Digital';
  const resolvedTitle = headline || title || 'Conteúdo & Audiência';
  const resolvedBody = body || text || description || caption || 'Criamos conteúdo estratégico para audiências engajadas em múltiplos canais digitais.';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#1e1b4b';
  const initial = resolvedBrand.charAt(0).toUpperCase();

  const demographics = [
    { label: '18–24', pct: 22 },
    { label: '25–34', pct: 38 },
    { label: '35–44', pct: 25 },
    { label: '45+', pct: 15 },
  ];

  const categories = [
    { icon: '📱', name: 'Tecnologia', pct: 34 },
    { icon: '💼', name: 'Negócios', pct: 28 },
    { icon: '🎨', name: 'Criatividade', pct: 20 },
    { icon: '📚', name: 'Educação', pct: 18 },
  ];

  const partnerships = [
    { tier: 'Bronze', price: 'R$ 2.500', features: ['1 post feed', 'Story 24h', 'Menção'], color: '#cd7f32' },
    { tier: 'Prata', price: 'R$ 6.000', features: ['3 posts', '5 Stories', 'Reel', 'Newsletter'], color: '#9ca3af' },
    { tier: 'Ouro', price: 'R$ 12.000', features: ['Pacote full', 'Live', 'Relatório', 'Consultoria'], color: '#f59e0b' },
  ];

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes mkct-appear { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mkct-wrap { animation: mkct-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div
        className="mkct-wrap"
        style={{
          width: '400px',
          background: '#ffffff',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)`, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {resolvedLogo ? (
            <img src={resolvedLogo} alt={resolvedBrand} style={{ width: '36px', height: '36px', borderRadius: '9px', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 900, border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
              {initial}
            </div>
          )}
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>{resolvedBrand}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginTop: '2px' }}>{resolvedTitle} · Media Kit 2025</div>
          </div>
        </div>

        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Tagline */}
          <p style={{ fontSize: '12px', color: '#374151', lineHeight: 1.6, margin: 0, padding: '10px 12px', background: '#f9fafb', borderRadius: '8px', borderLeft: `3px solid ${accent}` }}>
            {resolvedBody}
          </p>

          {/* Demographics */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Faixa Etária da Audiência
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              {demographics.map((d, i) => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', fontSize: '10px', fontWeight: 700, color: '#374151', flexShrink: 0 }}>{d.label}</div>
                  <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${d.pct}%`, height: '100%', background: i < 2 ? accent : `${accent}88`, borderRadius: '4px' }} />
                  </div>
                  <div style={{ width: '28px', fontSize: '10px', fontWeight: 700, color: accent, textAlign: 'right', flexShrink: 0 }}>{d.pct}%</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {[{ label: 'Feminino', pct: '58%', full: true }, { label: 'Masculino', pct: '42%', full: false }].map((g) => (
                <div key={g.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#6b7280' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, opacity: g.full ? 1 : 0.5 }} />
                  {g.label}: <strong style={{ color: '#374151' }}>{g.pct}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Content categories */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Categorias de Conteúdo
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {categories.map((cat) => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', borderRadius: '8px', padding: '8px 10px' }}>
                  <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{cat.name}</div>
                    <div style={{ fontSize: '10px', color: accent, fontWeight: 700 }}>{cat.pct}% do conteúdo</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Partnership tiers */}
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Opções de Parceria
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {partnerships.map((p) => (
                <div key={p.tier} style={{ borderRadius: '10px', border: `1.5px solid ${p.color}44`, padding: '12px 10px', background: `${p.color}08` }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#111827' }}>{p.tier}</div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: p.color, margin: '3px 0' }}>{p.price}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {p.features.map((f) => (
                      <div key={f} style={{ fontSize: '9px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ color: p.color, fontWeight: 900 }}>·</span> {f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            aria-label="Solicitar proposta de parceria"
            style={{ width: '100%', background: accent, color: '#fff', border: 'none', borderRadius: '9px', padding: '11px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
            </svg>
            Solicitar Proposta de Parceria
          </button>
        </div>
      </div>
    </div>
  );
};
