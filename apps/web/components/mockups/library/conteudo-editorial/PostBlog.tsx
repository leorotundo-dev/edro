'use client';

import React from 'react';

interface PostBlogProps {
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

export const PostBlog: React.FC<PostBlogProps> = ({
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
  brandColor = '#7c3aed',
}) => {
  const resolvedBrand = brandName || name || username || 'Blog Edro Digital';
  const resolvedTitle = headline || title || 'Como construir uma estratégia de conteúdo que converte em 2025';
  const resolvedExcerpt = body || text || description || caption || 'Descubra os pilares fundamentais de uma estratégia de conteúdo moderna: da pesquisa de palavras-chave à distribuição multicanal e mensuração de resultados reais.';
  const resolvedAuthor = name || username || 'Rafael Mendes';
  const resolvedFeaturedImage = postImage || thumbnail || image || null;
  const resolvedAvatar = profileImage || null;
  const accent = brandColor || '#7c3aed';
  const initial = resolvedAuthor.charAt(0).toUpperCase();
  const brandInitial = resolvedBrand.charAt(0).toUpperCase();

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-flex', flexDirection: 'column', gap: '14px' }}>
      <style>{`
        @keyframes pb-appear { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .pb-wrap { animation: pb-appear 0.4s cubic-bezier(0.22,1,0.36,1); }
        .pb-img-hover:hover { opacity: 0.92; }
      `}</style>

      <div
        className="pb-wrap"
        style={{ width: '360px', background: '#ffffff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.07), 0 16px 40px rgba(0,0,0,0.10)', border: '1px solid #e5e7eb' }}
      >
        {/* Blog site header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '10px', fontWeight: 900, flexShrink: 0 }}>
            {brandInitial}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>{resolvedBrand}</span>
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af' }}>blog</span>
        </div>

        {/* Featured image (16:9) */}
        <div
          className="pb-img-hover"
          style={{ width: '100%', paddingTop: '56.25%', position: 'relative', background: resolvedFeaturedImage ? 'none' : `linear-gradient(135deg, ${accent}22 0%, ${accent}44 100%)`, cursor: 'pointer', transition: 'opacity 0.2s' }}
        >
          {resolvedFeaturedImage ? (
            <img src={resolvedFeaturedImage} alt={resolvedTitle} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={`${accent}66`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
              </svg>
              <span style={{ fontSize: '11px', color: `${accent}88`, fontWeight: 600 }}>Imagem destaque 16:9</span>
            </div>
          )}
          {/* Reading time badge */}
          <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '5px', backdropFilter: 'blur(4px)' }}>
            7 min de leitura
          </div>
        </div>

        {/* Card body */}
        <div style={{ padding: '16px 18px 14px' }}>
          {/* Category pill */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: `${accent}18`, color: accent, letterSpacing: '0.04em' }}>
              Marketing de Conteúdo
            </span>
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', background: '#f3f4f6', color: '#6b7280' }}>
              SEO
            </span>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', lineHeight: 1.3, margin: '0 0 10px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>

          {/* Excerpt — 3-line clamp via overflow */}
          <div
            style={{
              fontSize: '13px',
              color: '#4b5563',
              lineHeight: 1.6,
              marginBottom: '14px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {resolvedExcerpt}
          </div>

          {/* Tags row */}
          <div style={{ display: 'flex', gap: '5px', marginBottom: '14px', flexWrap: 'wrap' }}>
            {['estratégia', 'conteúdo', 'conversão', '2025'].map((tag) => (
              <span key={tag} style={{ fontSize: '9px', color: '#9ca3af', background: '#f9fafb', border: '1px solid #f3f4f6', padding: '2px 7px', borderRadius: '4px' }}>
                #{tag}
              </span>
            ))}
          </div>

          {/* Author + date + share */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
            {/* Avatar */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                flexShrink: 0,
                background: resolvedAvatar ? `url(${resolvedAvatar}) center/cover no-repeat` : `linear-gradient(135deg, ${accent} 0%, ${accent}88 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {!resolvedAvatar && initial}
            </div>

            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#111827' }}>{resolvedAuthor}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>3 mar. 2026 · 7 min</div>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
              <button
                type="button"
                aria-label="Salvar post nos favoritos"
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '7px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Compartilhar este post"
                style={{ background: accent, border: 'none', borderRadius: '7px', padding: '0 12px', height: '30px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', color: '#fff', fontSize: '10px', fontWeight: 700 }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
