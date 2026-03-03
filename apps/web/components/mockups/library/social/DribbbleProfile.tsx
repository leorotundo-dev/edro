'use client';

import React, { useState } from 'react';

interface DribbbleProfileProps {
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
  followerCount?: string | number;
  followingCount?: string | number;
  likesReceived?: string | number;
  isPro?: boolean;
  shots?: string[];
}

export const DribbbleProfile: React.FC<DribbbleProfileProps> = ({
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
  followerCount = 8420,
  followingCount = 312,
  likesReceived = 24600,
  isPro = true,
  shots = [],
}) => {
  const [following, setFollowing] = useState(false);

  const resolvedName = name ?? brandName ?? username ?? 'Carla Mendes';
  const resolvedUsername = username ?? 'carlamendes';
  const bio =
    body ??
    caption ??
    description ??
    text ??
    headline ??
    title ??
    'Designer visual apaixonada por interfaces minimalistas e branding criativo. Baseada em São Paulo.';
  const bannerSrc = postImage ?? thumbnail ?? '';
  const avatarSrc = profileImage ?? image ?? '';

  const initials = resolvedName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const formatCount = (n: string | number) => {
    if (typeof n === 'string') return n;
    if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')}mil`;
    return n.toLocaleString('pt-BR');
  };

  // Placeholder gradient colors for 4 shot thumbnails
  const shotGradients = [
    'linear-gradient(135deg, #EA4C89 0%, #833AB4 100%)',
    'linear-gradient(135deg, #FF6B6B 0%, #FFA36C 100%)',
    'linear-gradient(135deg, #4FACFE 0%, #00F2FE 100%)',
    'linear-gradient(135deg, #43E97B 0%, #38F9D7 100%)',
  ];

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
      {/* Banner */}
      <div
        style={{
          width: '100%',
          height: 160,
          background: bannerSrc
            ? undefined
            : 'linear-gradient(135deg, #EA4C89 0%, #C026A0 50%, #833AB4 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {bannerSrc && (
          <img
            src={bannerSrc}
            alt="Banner do perfil"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* Decorative dot pattern */}
        {!bannerSrc && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        )}
      </div>

      {/* Avatar centered, overlapping banner */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
        <div
          style={{
            marginTop: -44,
            width: 88,
            height: 88,
            borderRadius: '50%',
            border: '4px solid #fff',
            background: 'linear-gradient(135deg, #EA4C89 0%, #833AB4 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 4px 12px rgba(234,76,137,0.3)',
            zIndex: 1,
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

        {/* Name + Pro badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10 }}>
          <span
            style={{
              color: '#111827',
              fontSize: 18,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {resolvedName}
          </span>
          {isPro && (
            <span
              style={{
                background: '#EA4C89',
                color: '#fff',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 5,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
              }}
            >
              Pro
            </span>
          )}
        </div>

        <div style={{ color: '#EA4C89', fontSize: 13, marginTop: 2 }}>@{resolvedUsername}</div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginTop: 14,
            width: '100%',
            borderTop: '1px solid #F3F4F6',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          {[
            { label: 'Seguidores', value: formatCount(followerCount) },
            { label: 'Seguindo', value: formatCount(followingCount) },
            { label: 'Curtidas', value: formatCount(likesReceived) },
          ].map((stat, i, arr) => (
            <div
              key={i}
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '10px 4px',
                borderRight: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none',
              }}
            >
              <div style={{ color: '#111827', fontSize: 15, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ color: '#6B7280', fontSize: 11, marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div style={{ padding: '12px 18px 4px', width: '100%', boxSizing: 'border-box' }}>
          <p
            style={{
              color: '#374151',
              fontSize: 13,
              lineHeight: 1.55,
              margin: 0,
              textAlign: 'center',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bio}
          </p>
        </div>

        {/* Follow button */}
        <div style={{ padding: '12px 18px', width: '100%', boxSizing: 'border-box' }}>
          <button
            type="button"
            aria-label={following ? 'Deixar de seguir designer' : 'Seguir designer'}
            onClick={() => setFollowing((v) => !v)}
            style={{
              width: '100%',
              background: following ? '#F3F4F6' : '#EA4C89',
              color: following ? '#374151' : '#fff',
              border: following ? '1.5px solid #D1D5DB' : '1.5px solid #EA4C89',
              borderRadius: 24,
              padding: '10px 0',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            {following ? '✓ Seguindo' : '+ Seguir'}
          </button>
        </div>
      </div>

      {/* Portfolio grid: 2x2 */}
      <div
        style={{
          padding: '0 14px 16px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
        }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: 120,
              borderRadius: 10,
              overflow: 'hidden',
              background: shots[i] ? undefined : shotGradients[i % shotGradients.length],
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {shots[i] ? (
              <img
                src={shots[i]}
                alt={`Shot ${i + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                  />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="rgba(255,255,255,0.5)" />
                  <path
                    d="M21 15l-5-5L5 21"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
