'use client';

import React, { useState } from 'react';

interface BehanceProfileProps {
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
  location?: string;
  projectCount?: number;
  followerCount?: string | number;
  followingCount?: string | number;
  appreciationCount?: string | number;
  isAvailable?: boolean;
  skills?: string[];
  featuredProjectTitle?: string;
}

export const BehanceProfile: React.FC<BehanceProfileProps> = ({
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
  location = 'São Paulo, Brasil',
  projectCount = 28,
  followerCount = 5340,
  followingCount = 218,
  appreciationCount = 19800,
  isAvailable = true,
  skills = ['Branding', 'Motion', 'Illustration'],
  featuredProjectTitle,
}) => {
  const [following, setFollowing] = useState(false);

  const resolvedName = name ?? brandName ?? username ?? 'Rafael Costa';
  const resolvedUsername = username ?? 'rafaelcosta';
  const bannerSrc = postImage ?? thumbnail ?? '';
  const avatarSrc = profileImage ?? image ?? '';
  const projectTitle =
    featuredProjectTitle ??
    headline ??
    title ??
    body ??
    caption ??
    description ??
    text ??
    'Identidade Visual — Agência Criativa';

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

  return (
    <div
      style={{
        width: 380,
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
          height: 180,
          background: bannerSrc
            ? undefined
            : 'linear-gradient(135deg, #0057FF 0%, #003DB3 50%, #001A66 100%)',
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
        {!bannerSrc && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)',
            }}
          />
        )}
        {/* Behance "Bē" watermark on banner */}
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -1,
          }}
        >
          Bē
        </div>
      </div>

      {/* Profile section */}
      <div style={{ padding: '0 18px 0', position: 'relative' }}>
        {/* Avatar overlapping banner — bottom-left */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: -26 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              border: '3px solid #fff',
              background: 'linear-gradient(135deg, #0057FF 0%, #003DB3 100%)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              boxShadow: '0 2px 8px rgba(0,87,255,0.25)',
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

          {/* Available badge floated right */}
          {isAvailable && (
            <div
              style={{
                marginLeft: 'auto',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: '#ECFDF5',
                color: '#065F46',
                border: '1px solid #A7F3D0',
                borderRadius: 20,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#10B981',
                }}
              />
              Disponível para trabalho
            </div>
          )}
        </div>

        {/* Name + location */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: '#111827', fontSize: 18, fontWeight: 700 }}>{resolvedName}</span>
          </div>

          {location && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: '#F3F4F6',
                color: '#6B7280',
                borderRadius: 12,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 500,
                marginTop: 5,
              }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                  stroke="#6B7280"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="3" stroke="#6B7280" strokeWidth="2" />
              </svg>
              {location}
            </div>
          )}
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            marginTop: 14,
            borderTop: '1px solid #F3F4F6',
            borderBottom: '1px solid #F3F4F6',
            marginLeft: -18,
            marginRight: -18,
          }}
        >
          {[
            { label: 'Projetos', value: projectCount },
            { label: 'Seguidores', value: formatCount(followerCount) },
            { label: 'Seguindo', value: formatCount(followingCount) },
            { label: 'Curtidas', value: formatCount(appreciationCount) },
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
              <div style={{ color: '#0057FF', fontSize: 14, fontWeight: 700 }}>{stat.value}</div>
              <div style={{ color: '#6B7280', fontSize: 10, marginTop: 1 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured project */}
        <div style={{ marginTop: 14 }}>
          <div style={{ color: '#6B7280', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Projeto em destaque
          </div>
          <div
            style={{
              width: '100%',
              height: 193,
              borderRadius: 10,
              overflow: 'hidden',
              background: 'linear-gradient(135deg, #0057FF 0%, #7B2FBE 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(ellipse at 30% 40%, rgba(255,255,255,0.12) 0%, transparent 60%)',
              }}
            />
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.4 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#fff" />
              <path d="M21 15l-5-5L5 21" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div
            style={{
              color: '#111827',
              fontSize: 14,
              fontWeight: 600,
              marginTop: 8,
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {projectTitle}
          </div>
        </div>

        {/* Skills */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {skills.slice(0, 3).map((skill, i) => (
              <span
                key={i}
                style={{
                  background: '#EEF2FF',
                  color: '#0057FF',
                  border: '1px solid #C7D7FF',
                  borderRadius: 20,
                  padding: '4px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Follow button */}
        <div style={{ padding: '14px 0 18px' }}>
          <button
            type="button"
            aria-label={following ? 'Deixar de seguir' : 'Seguir criativo'}
            onClick={() => setFollowing((v) => !v)}
            style={{
              width: '100%',
              background: following ? '#F3F4F6' : '#0057FF',
              color: following ? '#374151' : '#fff',
              border: following ? '1.5px solid #D1D5DB' : '1.5px solid #0057FF',
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
    </div>
  );
};
