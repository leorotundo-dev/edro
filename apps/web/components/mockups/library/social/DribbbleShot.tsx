'use client';

import React, { useState } from 'react';

interface DribbbleShotProps {
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
  likeCount?: number;
  viewCount?: string;
  tags?: string[];
  isPro?: boolean;
}

export const DribbbleShot: React.FC<DribbbleShotProps> = ({
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
  likeCount = 47,
  viewCount = '2,3mil',
  tags = ['UI', 'Mobile', 'App'],
  isPro = true,
}) => {
  const [following, setFollowing] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const resolvedName = name ?? brandName ?? username ?? 'Ana Lima';
  const resolvedUsername = username ?? 'analima';
  const displayTitle = headline ?? (name !== resolvedName ? name : undefined) ?? title ?? body ?? caption ?? description ?? text ?? 'Design Shot';
  const avatarSrc = profileImage ?? image ?? '';
  const shotImage = postImage ?? thumbnail ?? image ?? '';

  const initials = resolvedName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const displayLikes = liked ? likeCount + 1 : likeCount;

  return (
    <div
      style={{
        width: 360,
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 4px 16px rgba(0,0,0,0.09)',
      }}
    >
      {/* Header: designer info + follow button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 16px',
          gap: 10,
        }}
      >
        {/* Avatar */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EA4C89 0%, #833AB4 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={resolvedName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Name + handle */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              color: '#1A1A1A',
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {resolvedName}
          </div>
          <div style={{ color: '#EA4C89', fontSize: 12, lineHeight: 1.3 }}>
            @{resolvedUsername}
          </div>
        </div>

        {/* Follow button */}
        <button
          type="button"
          aria-label={following ? 'Deixar de seguir' : 'Seguir designer'}
          onClick={() => setFollowing((v) => !v)}
          style={{
            background: following ? '#F3F4F6' : '#EA4C89',
            color: following ? '#374151' : '#fff',
            border: following ? '1.5px solid #D1D5DB' : '1.5px solid #EA4C89',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {following ? 'Seguindo' : 'Segue'}
        </button>
      </div>

      {/* Shot image area */}
      <div
        style={{
          width: '100%',
          height: 270,
          position: 'relative',
          overflow: 'hidden',
          background: shotImage
            ? undefined
            : 'linear-gradient(135deg, #EA4C89 0%, #C026A0 40%, #833AB4 100%)',
        }}
      >
        {shotImage ? (
          <img
            src={shotImage}
            alt={displayTitle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          /* Placeholder with camera icon */
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              style={{ opacity: 0.6 }}
            >
              <path
                d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="12"
                cy="13"
                r="4"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="1.8"
              />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500 }}>
              Imagem do shot
            </span>
          </div>
        )}

        {/* Pro badge */}
        {isPro && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: '#EA4C89',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: 6,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Pro
          </div>
        )}
      </div>

      {/* Below image: title + stats */}
      <div style={{ padding: '12px 16px 0' }}>
        <div
          style={{
            color: '#111827',
            fontSize: 15,
            fontWeight: 700,
            marginBottom: 10,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {displayTitle}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Heart like button */}
          <button
            type="button"
            aria-label={liked ? 'Descurtir shot' : 'Curtir shot'}
            onClick={() => setLiked((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 8,
              color: liked ? '#EA4C89' : '#6B7280',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={liked ? '#EA4C89' : 'none'}
              style={{ transition: 'fill 0.15s ease' }}
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                stroke={liked ? '#EA4C89' : '#6B7280'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {displayLikes}
          </button>

          {/* Eye views */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 8px',
              color: '#6B7280',
              fontSize: 13,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                stroke="#6B7280"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="3" stroke="#6B7280" strokeWidth="1.8" />
            </svg>
            {viewCount} views
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Bookmark toggle */}
          <button
            type="button"
            aria-label={bookmarked ? 'Remover dos salvos' : 'Salvar shot'}
            onClick={() => setBookmarked((v) => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 8,
              color: bookmarked ? '#EA4C89' : '#6B7280',
              display: 'flex',
              alignItems: 'center',
              transition: 'color 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={bookmarked ? '#EA4C89' : 'none'}
              style={{ transition: 'fill 0.15s ease' }}
            >
              <path
                d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                stroke={bookmarked ? '#EA4C89' : '#6B7280'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Tags row */}
      <div style={{ padding: '8px 16px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tags.slice(0, 3).map((tag, i) => (
          <span
            key={i}
            style={{
              background: '#FDF2F8',
              color: '#BE185D',
              border: '1px solid #FBCFE8',
              borderRadius: 20,
              padding: '4px 12px',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
