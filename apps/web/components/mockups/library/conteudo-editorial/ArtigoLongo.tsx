'use client';

import React, { useState } from 'react';

interface ArtigoLongoProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const ArtigoLongo: React.FC<ArtigoLongoProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#1a1a2e',
}) => {
  const [bookmarked, setBookmarked] = useState(false);

  const resolvedTitle =
    headline || title || 'Como a inteligência artificial está transformando o jornalismo moderno';
  const resolvedAuthor = name || username || brandName || 'Maria Fernanda Costa';
  const resolvedBody =
    body ||
    text ||
    description ||
    caption ||
    'A revolução tecnológica que estamos vivenciando nos últimos anos trouxe mudanças profundas na forma como produzimos e consumimos informação. As ferramentas de IA generativa agora permitem que redações de qualquer tamanho produzam conteúdo de alta qualidade em escala sem precedentes.';
  const resolvedImage = image || postImage || thumbnail || null;
  const accent = brandColor || '#1a1a2e';

  return (
    <div
      style={{
        width: '420px',
        background: '#ffffff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: "'Georgia', 'Times New Roman', serif",
        border: '1px solid #e8e8e8',
      }}
    >
      <style>{`
        @keyframes al-fade-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .al-card { animation: al-fade-in 0.4s ease; }
        .al-action-btn:hover { background: rgba(0,0,0,0.06) !important; transform: scale(1.08); }
        .al-action-btn { transition: background 0.2s, transform 0.15s; }
        .al-bookmark-active { color: #f59e0b !important; }
      `}</style>

      <div className="al-card">
        {/* Hero image */}
        <div
          style={{
            width: '100%',
            height: '210px',
            background: resolvedImage
              ? `url(${resolvedImage}) center/cover no-repeat`
              : `linear-gradient(135deg, ${accent}cc 0%, ${accent}44 100%)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          {!resolvedImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.15,
              }}
            >
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
          )}

          {/* Category badge */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              background: accent,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: "'Helvetica Neue', sans-serif",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '4px 10px',
              borderRadius: '4px',
            }}
          >
            Artigo Especial
          </div>

          {/* Read time */}
          <div
            style={{
              position: 'absolute',
              top: '14px',
              right: '14px',
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: '10px',
              fontFamily: "'Helvetica Neue', sans-serif",
              padding: '4px 9px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            8 min de leitura
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 22px 16px' }}>
          {/* Title */}
          <h2
            style={{
              fontSize: '19px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.28,
              margin: '0 0 12px',
              letterSpacing: '-0.02em',
            }}
          >
            {resolvedTitle}
          </h2>

          {/* Body excerpt */}
          <p
            style={{
              fontSize: '13.5px',
              color: '#4b5563',
              lineHeight: 1.65,
              margin: '0 0 16px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {resolvedBody}
          </p>

          {/* Divider */}
          <div style={{ height: '1px', background: '#f0f0f0', margin: '0 0 14px' }} />

          {/* Author row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Avatar */}
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: resolvedImage
                    ? `url(${profileImage || resolvedImage}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${accent} 0%, ${accent}88 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: "'Helvetica Neue', sans-serif",
                  flexShrink: 0,
                }}
              >
                {!profileImage && resolvedAuthor.charAt(0).toUpperCase()}
              </div>
              <div>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#111827',
                    fontFamily: "'Helvetica Neue', sans-serif",
                  }}
                >
                  {resolvedAuthor}
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', fontFamily: "'Helvetica Neue', sans-serif" }}>
                  3 de março de 2026
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                aria-label="Compartilhar artigo"
                className="al-action-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: '7px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                  <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
                </svg>
              </button>
              <button
                type="button"
                aria-label={bookmarked ? 'Remover dos salvos' : 'Salvar artigo'}
                className={`al-action-btn${bookmarked ? ' al-bookmark-active' : ''}`}
                onClick={() => setBookmarked((b) => !b)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  padding: '7px',
                  color: bookmarked ? '#f59e0b' : '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
