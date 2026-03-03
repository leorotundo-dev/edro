'use client';

import React from 'react';

interface NoticiaProps {
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

export const Noticia: React.FC<NoticiaProps> = ({
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
  brandColor = '#dc2626',
}) => {
  const resolvedPublication = brandName || name || username || 'Portal de Notícias';
  const resolvedHeadline = headline || title || 'Empresa anuncia expansão para novos mercados em 2025';
  const resolvedLede = body || text || description || caption || 'A companhia divulgou hoje seus planos de crescimento, incluindo abertura de filiais em três estados e contratação de 500 novos colaboradores até o final do ano.';
  const resolvedReporter = name || username || 'Marina Oliveira';
  const resolvedLogo = image || postImage || thumbnail || profileImage || null;
  const accent = brandColor || '#dc2626';
  const initial = resolvedPublication.charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes not-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .not-wrap { animation: not-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
      `}</style>

      <div
        className="not-wrap"
        style={{ width: '400px', background: '#ffffff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.09)', border: '1px solid #e5e7eb' }}
      >
        {/* Publication header */}
        <div style={{ background: accent, padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {resolvedLogo ? (
              <img src={resolvedLogo} alt={resolvedPublication} style={{ height: '22px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
            ) : (
              <div style={{ width: '26px', height: '26px', borderRadius: '5px', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 900, fontFamily: 'sans-serif' }}>
                {initial}
              </div>
            )}
            <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff', fontFamily: "'Helvetica Neue', Arial, sans-serif", letterSpacing: '-0.01em' }}>
              {resolvedPublication}
            </span>
          </div>
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
            3 mar. 2026 · 14h32
          </span>
        </div>

        {/* Nav bar */}
        <div style={{ background: '#1f2937', padding: '6px 18px', display: 'flex', gap: '14px' }}>
          {['Início', 'Política', 'Economia', 'Tecnologia', 'Esportes'].map((item, i) => (
            <span key={item} style={{ fontSize: '10px', color: i === 2 ? accent : 'rgba(255,255,255,0.55)', fontWeight: i === 2 ? 700 : 400, fontFamily: 'sans-serif', whiteSpace: 'nowrap', borderBottom: i === 2 ? `2px solid ${accent}` : 'none', paddingBottom: '2px', cursor: 'default' }}>
              {item}
            </span>
          ))}
        </div>

        {/* Article body */}
        <div style={{ padding: '20px 20px 18px' }}>
          {/* Category tags */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {['Economia', 'Negócios', 'Mercado'].map((cat, i) => (
              <span key={cat} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: i === 0 ? accent : '#f3f4f6', color: i === 0 ? '#fff' : '#6b7280', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {cat}
              </span>
            ))}
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#111827', lineHeight: 1.25, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
            {resolvedHeadline}
          </h1>

          {/* Lede */}
          <p style={{ fontSize: '13.5px', color: '#374151', lineHeight: 1.65, margin: '0 0 14px', fontWeight: 500, borderLeft: `3px solid ${accent}`, paddingLeft: '12px' }}>
            {resolvedLede}
          </p>

          {/* Body placeholder lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
            {[95, 88, 100, 72, 92].map((w, i) => (
              <div key={i} style={{ height: '9px', background: '#f3f4f6', borderRadius: '3px', width: `${w}%` }} />
            ))}
          </div>

          {/* Pull quote */}
          <div style={{ background: `${accent}0d`, border: `1px solid ${accent}33`, borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
            <div style={{ fontSize: '22px', color: accent, lineHeight: 0.5, fontWeight: 900, marginBottom: '4px' }}>"</div>
            <p style={{ fontSize: '13px', color: '#111827', fontStyle: 'italic', margin: 0, lineHeight: 1.55 }}>
              Este é o maior investimento da empresa em sua história de 20 anos, reafirmando nosso compromisso com o crescimento sustentável.
            </p>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', fontFamily: 'sans-serif' }}>
              — CEO, ao comunicado oficial
            </div>
          </div>

          {/* Byline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid #f3f4f6', fontFamily: 'sans-serif' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `linear-gradient(135deg, ${accent} 0%, ${accent}99 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
              {resolvedReporter.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#111827' }}>Por {resolvedReporter}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>Repórter · Economia e Negócios</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              {['Compartilhar', 'Salvar'].map((lbl) => (
                <button key={lbl} type="button" aria-label={lbl} style={{ background: lbl === 'Compartilhar' ? accent : '#f3f4f6', color: lbl === 'Compartilhar' ? '#fff' : '#374151', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
