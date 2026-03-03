'use client';
import React, { useState } from 'react';

interface SubstackNewsletterProps {
  publicationName?: string;
  name?: string;
  brandName?: string;
  username?: string;
  publicationIcon?: string;
  profileImage?: string;
  image?: string;
  postTitle?: string;
  headline?: string;
  title?: string;
  excerpt?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  coverImage?: string;
  postImage?: string;
  thumbnail?: string;
  authorName?: string;
  authorAvatar?: string;
  subscriberCount?: string | number;
  likeCount?: number;
  commentCount?: number;
  readTime?: string | number;
  timeLabel?: string;
  isPaid?: boolean;
  isTopPost?: boolean;
}

// Substack "S" logo (orange)
const SubstackLogo = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF6719">
    <path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z" />
  </svg>
);

export const SubstackNewsletter: React.FC<SubstackNewsletterProps> = ({
  publicationName,
  name,
  brandName,
  username,
  publicationIcon,
  profileImage,
  image,
  postTitle,
  headline,
  title,
  excerpt,
  body,
  caption,
  description,
  text,
  coverImage,
  postImage,
  thumbnail,
  authorName,
  authorAvatar,
  subscriberCount = '3.400',
  likeCount = 48,
  commentCount = 12,
  readTime = 5,
  timeLabel = 'Há 2 horas',
  isPaid = false,
  isTopPost = false,
}) => {
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const displayPub = publicationName || name || brandName || 'Publicação';
  const displayIcon = publicationIcon || profileImage || image || '';
  const displayTitle = postTitle || headline || title || 'Título da Newsletter';
  const displayExcerpt = excerpt || body || caption || description || text || 'Leia este artigo exclusivo sobre os temas mais relevantes da semana...';
  const displayCover = coverImage || postImage || thumbnail || '';
  const displayAuthor = authorName || name || brandName || displayPub;
  const displayAuthorAvatar = authorAvatar || profileImage || image || '';
  const displayReadTime = typeof readTime === 'number' ? `${readTime} min` : readTime;

  const subCount = typeof subscriberCount === 'number'
    ? subscriberCount.toLocaleString('pt-BR')
    : subscriberCount;

  return (
    <div style={{
      width: 420,
      background: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '"Georgia", "Times New Roman", serif',
      color: '#1C1B1B',
      boxShadow: '0 4px 24px rgba(0,0,0,0.1)',
      border: '1px solid #E5E7EB',
      flexShrink: 0,
    }}>
      {/* Publication header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFAFA',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            overflow: 'hidden', background: '#FF6719',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {displayIcon
              ? <img src={displayIcon} alt={displayPub} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <SubstackLogo size={20} />
            }
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1C1B1B', fontFamily: 'system-ui, sans-serif' }}>{displayPub}</div>
            <div style={{ fontSize: 11.5, color: '#6B7280', fontFamily: 'system-ui, sans-serif' }}>{subCount} assinantes</div>
          </div>
        </div>
        <button
          type="button"
          aria-label={subscribed ? 'Assinando' : 'Assinar'}
          onClick={() => setSubscribed(s => !s)}
          style={{
            background: subscribed ? '#fff' : '#FF6719',
            border: `1.5px solid ${subscribed ? '#E5E7EB' : '#FF6719'}`,
            borderRadius: 4,
            color: subscribed ? '#6B7280' : '#fff',
            fontSize: 13,
            fontWeight: 700,
            padding: '6px 16px',
            cursor: 'pointer',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {subscribed ? 'Assinando' : 'Assinar'}
        </button>
      </div>

      {/* Cover image */}
      {displayCover && (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <img
            src={displayCover}
            alt={displayTitle}
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Post content */}
      <div style={{ padding: '20px 20px 14px' }}>
        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {isPaid && (
            <span style={{
              background: '#FFF8F0', border: '1px solid #FFCC99',
              borderRadius: 4, padding: '2px 8px',
              fontSize: 11, fontWeight: 700, color: '#FF6719',
              fontFamily: 'system-ui, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Para assinantes
            </span>
          )}
          {isTopPost && (
            <span style={{
              background: '#F0F9FF', border: '1px solid #BAE6FD',
              borderRadius: 4, padding: '2px 8px',
              fontSize: 11, fontWeight: 700, color: '#0369A1',
              fontFamily: 'system-ui, sans-serif',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Top post
            </span>
          )}
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.3,
          color: '#1C1B1B',
          margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          {displayTitle}
        </h2>

        {/* Excerpt */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.65,
          color: '#4B5563',
          margin: '0 0 16px',
          fontStyle: 'italic',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {displayExcerpt}
        </p>

        {/* Author + metadata row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          paddingTop: 12,
          borderTop: '1px solid #E5E7EB',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            overflow: 'hidden', background: '#E5E7EB', flexShrink: 0,
          }}>
            {displayAuthorAvatar
              ? <img src={displayAuthorAvatar} alt={displayAuthor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (
                <div style={{
                  width: '100%', height: '100%',
                  background: 'linear-gradient(135deg, #FF6719 0%, #FFAA77 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: '#fff',
                }}>
                  {displayAuthor.charAt(0).toUpperCase()}
                </div>
              )
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1C1B1B' }}>{displayAuthor}</span>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 6 }}>
              {timeLabel} · {displayReadTime} de leitura
            </span>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        padding: '10px 18px 14px',
        borderTop: '1px solid #F3F4F6',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* Like */}
          <button
            type="button"
            aria-label="Curtir"
            onClick={() => setLiked(l => !l)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              color: liked ? '#FF6719' : '#6B7280', padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? '#FF6719' : 'none'} stroke={liked ? '#FF6719' : '#6B7280'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{likeCount + (liked ? 1 : 0)}</span>
          </button>

          {/* Comment */}
          <button type="button" aria-label="Comentários" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#6B7280', padding: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{commentCount}</span>
          </button>

          {/* Share */}
          <button type="button" aria-label="Compartilhar" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
            color: '#6B7280', padding: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Compartilhar</span>
          </button>
        </div>

        {/* Read more */}
        <button type="button" aria-label="Ler artigo completo" style={{
          background: '#FF6719', border: 'none', borderRadius: 4,
          color: '#fff', fontSize: 13, fontWeight: 700,
          padding: '6px 14px', cursor: 'pointer',
        }}>
          Ler →
        </button>
      </div>
    </div>
  );
};
