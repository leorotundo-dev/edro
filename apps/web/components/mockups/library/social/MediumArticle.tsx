'use client';

import React, { useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediumArticleProps {
  // Studio base props - identity
  name?: string;
  username?: string;
  brandName?: string;
  publication?: string;
  // Studio base props - content
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  // Studio base props - media
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Author
  authorName?: string;
  authorAvatar?: string;
  // Article-specific
  readTime?: string;
  clapCount?: number | string;
  commentCount?: number | string;
  articleDate?: string;
  tags?: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCount(n: number | string | undefined): string {
  if (n === undefined || n === null) return '0';
  if (typeof n === 'string') return n;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BookmarkIcon = ({ active }: { active: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? '#000' : 'none'} stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ClapIcon = () => (
  <svg width="18" height="18" viewBox="0 0 50 50" fill="currentColor" aria-hidden="true">
    <path d="M27.3 7.6c-.3-.8-1.1-1.3-1.9-1.3-.6 0-1.1.2-1.5.6L15 16.3c-.2.2-.4.5-.5.8l-.8-4.5c-.2-1-.9-1.7-1.9-1.7-.5 0-1 .2-1.4.6-.5.5-.7 1.2-.6 1.9l1.8 10.3-1.3-1.3c-.4-.4-.9-.6-1.4-.6-.5 0-1 .2-1.4.6-.8.8-.8 2 0 2.8l8.2 8.3c1.8 1.9 4.3 2.9 6.9 2.9 5.2 0 9.4-4.2 9.4-9.4v-8.5L27.3 7.6zm4.2 19c0 3.9-3.2 7.1-7.1 7.1-1.9 0-3.8-.8-5.1-2.2l-7.8-7.9.7-.7 3.6 3.6.5-1.9L14 14.5l-.3-1.6.5-.5.4 2.1L16 26l1.9.5 1-11.1.5-.6 1.9 1.9v9.8l2 .5V16.5l1.4-1.4 2.2 5.4-1.5 1.5 1.5 1.5 2.6-2.6v5.7z" />
  </svg>
);

const CommentIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const DotsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

// ─── Medium "M" logo ─────────────────────────────────────────────────────────

const MediumLogo = () => (
  <div
    style={{
      width: 28, height: 28, borderRadius: '50%',
      background: '#000', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em',
      flexShrink: 0,
    }}
  >
    M
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const MediumArticle: React.FC<MediumArticleProps> = ({
  name,
  username,
  brandName,
  publication,
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
  authorName,
  authorAvatar,
  readTime = '5 min de leitura',
  clapCount = 1284,
  commentCount = 38,
  articleDate = '28 fev',
  tags = ['tecnologia', 'marketing', 'negócios'],
}) => {
  const [following, setFollowing] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [clapped, setClapped] = useState(false);
  const [clapCountState, setClapCountState] = useState(
    typeof clapCount === 'number' ? clapCount : 0
  );

  const displayPublication = publication || brandName || name || 'The Startup';
  const displayAuthor = authorName || username || 'Rafael Mendes';
  const displayTitle = headline || title || 'Como a IA está transformando o mercado de conteúdo em 2025';
  const displaySubtitle = body || caption || description || text || 'Uma análise profunda sobre as mudanças que a inteligência artificial trouxe para criadores e marcas — e o que esperar nos próximos anos.';
  const mediaSrc = image || postImage || thumbnail || '';

  return (
    <div
      style={{
        width: 420,
        maxWidth: '100%',
        background: '#ffffff',
        borderRadius: 8,
        boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#1a1a1a',
        boxSizing: 'border-box',
        border: '1px solid #e8e8e8',
      }}
    >
      {/* ── Publication header ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '12px 16px',
          borderBottom: '1px solid #f2f2f2',
        }}
      >
        <MediumLogo />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{displayPublication}</span>
          <span style={{ fontSize: 11, color: '#1A8917', fontWeight: 600, marginLeft: 8, background: '#f0faf0', padding: '1px 6px', borderRadius: 20 }}>
            Membro
          </span>
        </div>
        <button
          type="button"
          aria-label={following ? 'Deixar de seguir publicação' : 'Seguir publicação'}
          onClick={() => setFollowing((p) => !p)}
          style={{
            padding: '5px 14px',
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            border: following ? '1px solid #757575' : '1px solid #1a1a1a',
            background: 'transparent',
            color: following ? '#757575' : '#1a1a1a',
          }}
        >
          {following ? 'Seguindo' : 'Seguir'}
        </button>
      </div>

      {/* ── Article body ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Text block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title */}
            <h2
              style={{
                margin: '0 0 8px',
                fontWeight: 700,
                fontSize: 20,
                lineHeight: '1.3',
                color: '#1a1a1a',
                fontFamily: 'Georgia, "Times New Roman", serif',
                wordBreak: 'break-word',
              }}
            >
              {displayTitle}
            </h2>

            {/* Subtitle/excerpt */}
            <p
              style={{
                margin: '0 0 12px',
                fontSize: 14,
                lineHeight: '1.6',
                color: '#757575',
                fontStyle: 'italic',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {displaySubtitle}
            </p>
          </div>

          {/* Cover image (right side) */}
          {mediaSrc && (
            <div
              style={{
                width: 80, height: 80, flexShrink: 0,
                borderRadius: 4, overflow: 'hidden',
                background: '#f2f2f2',
              }}
            >
              <img src={mediaSrc} alt="Imagem do artigo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>

        {/* Author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#e8e8e8', overflow: 'hidden', flexShrink: 0,
            }}
          >
            {authorAvatar ? (
              <img src={authorAvatar} alt={displayAuthor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #000 0%, #333 100%)' }} />
            )}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{displayAuthor}</span>
          <span style={{ color: '#d1d1d1' }}>·</span>
          <span style={{ fontSize: 13, color: '#757575' }}>{readTime}</span>
          <span style={{ color: '#d1d1d1' }}>·</span>
          <span style={{ fontSize: 13, color: '#757575' }}>{articleDate}</span>

          {/* Bookmark (right-aligned) */}
          <button
            type="button"
            aria-label={bookmarked ? 'Remover marcador' : 'Salvar artigo'}
            onClick={() => setBookmarked((p) => !p)}
            style={{
              marginLeft: 'auto',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: 2, lineHeight: 0,
              color: '#1a1a1a',
            }}
          >
            <BookmarkIcon active={bookmarked} />
          </button>
        </div>

        {/* Tags row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: 12,
                color: '#757575',
                background: '#f2f2f2',
                borderRadius: 20,
                padding: '3px 10px',
                cursor: 'pointer',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Footer / actions ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center',
          padding: '10px 16px 12px',
          borderTop: '1px solid #f2f2f2',
          gap: 16,
        }}
      >
        <button
          type="button"
          aria-label="Aplaudir artigo"
          onClick={() => {
            setClapped((p) => !p);
            setClapCountState((c) => clapped ? c - 1 : c + 1);
          }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            color: clapped ? '#1a1a1a' : '#757575',
            fontSize: 13, padding: 0, fontWeight: clapped ? 700 : 400,
          }}
        >
          <ClapIcon />
          {formatCount(clapCountState)}
        </button>

        <button
          type="button"
          aria-label="Ver comentários"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#757575', fontSize: 13, padding: 0,
          }}
        >
          <CommentIcon />
          {formatCount(commentCount)}
        </button>

        <button
          type="button"
          aria-label="Mais opções"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#757575', padding: 2, marginLeft: 'auto', lineHeight: 0,
          }}
        >
          <DotsIcon />
        </button>
      </div>
    </div>
  );
};
