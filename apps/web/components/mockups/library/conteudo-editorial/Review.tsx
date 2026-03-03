'use client';

import React from 'react';

interface ReviewProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const Review: React.FC<ReviewProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  description,
  caption,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#f59e0b',
}) => {
  const accent = brandColor || '#f59e0b';
  const resolvedProduct = headline || title || 'Edro AI Suite';
  const resolvedBrand = brandName || name || username || 'Edro Digital';
  const resolvedReviewer = name || username || 'Carlos Mendes';
  const resolvedBody =
    body || text || description || caption ||
    'Utilizamos o Edro AI Suite há 4 meses e a transformação na produção de conteúdo foi impressionante. A qualidade dos textos gerados supera o que tínhamos antes, e a integração com nosso CMS foi praticamente instantânea. Recomendo para qualquer equipe editorial que queira escalar sem perder qualidade.';
  const resolvedAvatar = image || postImage || thumbnail || profileImage || null;

  const rating = 4.5;
  const totalStars = 5;
  const reviewDate = '12 de fevereiro de 2026';

  const pros = [
    'Interface intuitiva e curva de aprendizado baixa',
    'Qualidade de geração de texto acima da média do mercado',
    'Suporte ao cliente extremamente ágil e eficiente',
  ];

  const cons = [
    'Preço pode ser elevado para microempresas',
    'Limite de tokens no plano básico é restritivo',
  ];

  const initials = resolvedReviewer
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w.charAt(0).toUpperCase())
    .join('');

  return (
    <div style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif", display: 'inline-block' }}>
      <style>{`
        @keyframes rv-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .rv-wrap { animation: rv-fade 0.4s ease; }
      `}</style>

      <div
        className="rv-wrap"
        style={{
          width: '380px',
          background: '#ffffff',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.09)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header: product name + company */}
        <div
          style={{
            background: `linear-gradient(135deg, #111827 0%, #1f2937 100%)`,
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: '4px',
                }}
              >
                Avaliação de Produto
              </div>
              <div style={{ fontSize: '16px', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                {resolvedProduct}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', marginTop: '3px' }}>
                por {resolvedBrand}
              </div>
            </div>
            {/* Platform badge */}
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.04em' }}>
                Google Reviews
              </span>
            </div>
          </div>

          {/* Star rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {Array.from({ length: totalStars }).map((_, i) => {
                const filled = i < Math.floor(rating);
                const half = !filled && i < rating;
                return (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={filled ? accent : half ? 'url(#half)' : 'none'} stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    {i === 0 && (
                      <defs>
                        <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="50%" stopColor={accent} />
                          <stop offset="50%" stopColor="transparent" />
                        </linearGradient>
                      </defs>
                    )}
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                );
              })}
            </div>
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
              {rating}
            </span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>
              / 5
            </span>
          </div>
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* Reviewer info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '14px',
              paddingBottom: '14px',
              borderBottom: '1px solid #f3f4f6',
            }}
          >
            {resolvedAvatar ? (
              <img
                src={resolvedAvatar}
                alt={resolvedReviewer}
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 900,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
                  {resolvedReviewer}
                </span>
                {/* Verificado badge */}
                <span
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    background: '#d1fae5',
                    color: '#065f46',
                    padding: '1px 6px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verificado
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                Diretor de Marketing · {reviewDate}
              </div>
            </div>
          </div>

          {/* Review body */}
          <p
            style={{
              fontSize: '13px',
              color: '#374151',
              lineHeight: 1.7,
              margin: '0 0 16px',
            }}
          >
            &ldquo;{resolvedBody}&rdquo;
          </p>

          {/* Pros and cons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            {/* Pros */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#166534',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Pontos Positivos
              </div>
              {pros.map((p, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: '#166534',
                    lineHeight: 1.45,
                    marginBottom: i < pros.length - 1 ? '5px' : 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '5px',
                  }}
                >
                  <span style={{ color: '#16a34a', marginTop: '1px', flexShrink: 0 }}>+</span>
                  {p}
                </div>
              ))}
            </div>

            {/* Cons */}
            <div
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                borderRadius: '8px',
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: '#9f1239',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Pontos Negativos
              </div>
              {cons.map((c, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: '11px',
                    color: '#9f1239',
                    lineHeight: 1.45,
                    marginBottom: i < cons.length - 1 ? '5px' : 0,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '5px',
                  }}
                >
                  <span style={{ color: '#e11d48', marginTop: '1px', flexShrink: 0 }}>−</span>
                  {c}
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              aria-label="Ver página do produto avaliado"
              style={{
                flex: 1,
                background: accent,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 16px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Ver Produto
            </button>
            <button
              type="button"
              aria-label="Marcar avaliação como útil"
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              Útil (47)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
