'use client';

import React from 'react';

interface LinkedInArticleProps {
  // Studio base aliases
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  // Component-specific
  readTime?: string | number;
  likeCount?: string | number;
  commentCount?: string | number;
  authorName?: string;
  authorAvatar?: string;
  followerCount?: string;
}

export const LinkedInArticle: React.FC<LinkedInArticleProps> = ({
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  readTime = 5,
  likeCount = 248,
  commentCount = 34,
  authorName,
  authorAvatar,
  followerCount = '12.847 seguidores',
}) => {
  const resolvedAuthorName = authorName ?? name ?? brandName ?? username ?? 'Nome do Autor';
  const articleTitle =
    body ??
    caption ??
    text ??
    'Como Construir uma Estratégia de Conteúdo que Gera Resultados Reais em 2025';
  const articleDescription =
    description ??
    'Descubra as principais tendências e metodologias que líderes de mercado estão utilizando para criar conteúdo relevante, aumentar o engajamento e converter seguidores em clientes.';
  const coverImage = postImage ?? image ?? thumbnail ?? '';
  const avatarSrc = authorAvatar ?? profileImage ?? '';

  const readTimeLabel = typeof readTime === 'number' ? `${readTime} min de leitura` : readTime;
  const likes = typeof likeCount === 'number' ? likeCount.toLocaleString('pt-BR') : likeCount;
  const comments = typeof commentCount === 'number' ? commentCount.toLocaleString('pt-BR') : commentCount;

  const authorInitials = resolvedAuthorName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 400,
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #E0E0E0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Cover image — 16:9 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: 'linear-gradient(135deg, #C8D8E8 0%, #A0B8D0 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt="Capa do artigo"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 40,
            }}
          >
            📄
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 18px 14px' }}>
        {/* ARTIGO label */}
        <div
          style={{
            color: '#0A66C2',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Artigo
        </div>

        {/* Title — 2-line clamp */}
        <h2
          style={{
            color: '#191919',
            fontSize: 17,
            fontWeight: 700,
            lineHeight: '1.35',
            margin: '0 0 8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {articleTitle}
        </h2>

        {/* Description — 3-line clamp */}
        <p
          style={{
            color: '#5E5E5E',
            fontSize: 13,
            lineHeight: '1.5',
            margin: '0 0 14px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {articleDescription}
        </p>

        {/* Author row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            paddingTop: 12,
            borderTop: '1px solid #E8E8E8',
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={resolvedAuthorName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              authorInitials
            )}
          </div>

          {/* Author info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, flexWrap: 'wrap' }}>
              <span style={{ color: '#191919', fontSize: 12.5, fontWeight: 600 }}>
                {resolvedAuthorName}
              </span>
              <span style={{ color: '#5E5E5E', fontSize: 12 }}>no LinkedIn</span>
            </div>
            <div style={{ color: '#5E5E5E', fontSize: 11, marginTop: 1 }}>{followerCount}</div>
          </div>

          {/* Seguir button */}
          <button
            type="button"
            style={{
              border: '1.5px solid #0A66C2',
              borderRadius: 16,
              padding: '5px 14px',
              color: '#0A66C2',
              background: 'transparent',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + Seguir
          </button>
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid #F0F0F0',
          }}
        >
          {/* Read time */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5E5E', fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#5E5E5E" strokeWidth="1.8" />
              <path d="M12 7v5l3 3" stroke="#5E5E5E" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {readTimeLabel}
          </div>

          <div style={{ flex: 1 }} />

          {/* Likes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#5E5E5E', fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"
                stroke="#5E5E5E"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {likes}
          </div>

          {/* Comments */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#5E5E5E', fontSize: 12 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
                stroke="#5E5E5E"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {comments}
          </div>
        </div>
      </div>
    </div>
  );
};
