'use client';

import React, { useState } from 'react';

interface LinkedInNewsletterProps {
  // Studio base aliases
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
  // Component-specific
  authorName?: string;
  authorAvatar?: string;
  issueNumber?: string | number;
  subscriberCount?: string | number;
  likeCount?: string | number;
  commentCount?: string | number;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const LinkedInNewsletter: React.FC<LinkedInNewsletterProps> = ({
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
  authorName,
  authorAvatar,
  issueNumber = 12,
  subscriberCount = 8400,
  likeCount = 312,
  commentCount = 47,
}) => {
  const [subscribed, setSubscribed] = useState(false);

  const resolvedAuthorName = authorName ?? name ?? brandName ?? username ?? 'Maria Oliveira';
  const newsletterTitle =
    headline ??
    title ??
    body ??
    caption ??
    text ??
    'As 5 Tendências de Marketing Digital que Vão Dominar o Próximo Trimestre';
  const excerpt =
    description ??
    body ??
    caption ??
    text ??
    'Nesta edição, exploramos como as marcas líderes estão adaptando suas estratégias para o novo comportamento do consumidor digital, com foco em conteúdo de valor e comunidade.';
  const coverImage = postImage ?? image ?? thumbnail ?? '';
  const avatarSrc = authorAvatar ?? profileImage ?? '';

  const issueLabel = `Número #${issueNumber}`;
  const subCount =
    typeof subscriberCount === 'number'
      ? subscriberCount.toLocaleString('pt-BR')
      : subscriberCount;
  const likes = formatCount(likeCount);
  const comments = formatCount(commentCount);

  const initials = resolvedAuthorName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 420,
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #E0E0E0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}
    >
      {/* Cover banner — 16:9 */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          background: 'linear-gradient(135deg, #004182 0%, #0A66C2 50%, #70B5F9 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt="Capa da newsletter"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {/* Newsletter envelope icon */}
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
              <path d="M2 7l10 7 10-7" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 500 }}>Newsletter</span>
          </div>
        )}
        {/* LinkedIn logo watermark */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            left: 12,
            background: 'rgba(0,0,0,0.45)',
            borderRadius: 4,
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff">
            <path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z" />
            <circle cx="4" cy="4" r="2" />
          </svg>
          <span style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>LinkedIn</span>
        </div>
      </div>

      {/* Content area */}
      <div style={{ padding: '16px 18px 0' }}>
        {/* NEWSLETTER badge */}
        <div
          style={{
            display: 'inline-block',
            color: '#0A66C2',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 10,
            padding: '3px 8px',
            background: '#EDF3FB',
            borderRadius: 3,
          }}
        >
          Newsletter
        </div>

        {/* Newsletter title */}
        <h2
          style={{
            color: '#191919',
            fontSize: 22,
            fontWeight: 700,
            lineHeight: '1.3',
            margin: '0 0 14px',
            letterSpacing: '-0.01em',
          }}
        >
          {newsletterTitle}
        </h2>

        {/* Author row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
              overflow: 'hidden',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
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
              initials
            )}
          </div>

          {/* Author info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#191919',
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {resolvedAuthorName}
            </div>
            <div style={{ color: '#5E5E5E', fontSize: 12, marginTop: 1 }}>
              {issueLabel} &middot; {subCount} assinantes
            </div>
          </div>

          {/* Subscribe toggle */}
          <button
            type="button"
            aria-label={subscribed ? 'Cancelar assinatura' : 'Assinar newsletter'}
            onClick={() => setSubscribed((s) => !s)}
            style={{
              border: `1.5px solid #0A66C2`,
              borderRadius: 16,
              padding: '6px 16px',
              color: subscribed ? '#fff' : '#0A66C2',
              background: subscribed ? '#0A66C2' : 'transparent',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              transition: 'all 0.15s ease',
            }}
          >
            {subscribed ? 'Assinado' : 'Assinar'}
          </button>
        </div>

        {/* Excerpt */}
        <p
          style={{
            color: '#5E5E5E',
            fontSize: 14,
            lineHeight: '1.55',
            margin: '0 0 16px',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {excerpt}
        </p>
      </div>

      {/* Engagement row */}
      <div
        style={{
          padding: '10px 18px',
          borderTop: '1px solid #F0F0F0',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        {/* Likes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5E5E', fontSize: 13 }}>
          {/* LinkedIn reaction thumb + heart stacked icons */}
          <span style={{ fontSize: 15 }}>👍</span>
          <span>{likes}</span>
        </div>

        {/* Comments */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5E5E', fontSize: 13 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#5E5E5E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span>{comments} comentários</span>
        </div>

        {/* Share */}
        <button
          type="button"
          aria-label="Compartilhar newsletter"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            color: '#5E5E5E',
            fontSize: 13,
            fontWeight: 500,
            padding: 0,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Compartilhar
        </button>
      </div>

      {/* CTA button */}
      <div style={{ padding: '0 18px 18px' }}>
        <button
          type="button"
          aria-label="Ler newsletter completa"
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 0',
            background: '#0A66C2',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            letterSpacing: '0.01em',
          }}
        >
          Ler newsletter completa
        </button>
      </div>
    </div>
  );
};
