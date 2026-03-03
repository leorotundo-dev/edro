'use client';

import React, { useState } from 'react';

interface BehanceProjectProps {
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
  category?: string;
  appreciationCount?: number;
  viewCount?: string;
  categories?: string[];
}

export const BehanceProject: React.FC<BehanceProjectProps> = ({
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
  appreciationCount = 1243,
  viewCount = '18,4mil',
  categories = ['Branding', 'Identidade Visual'],
}) => {
  const [appreciated, setAppreciated] = useState(false);
  const [saved, setSaved] = useState(false);

  const resolvedName = name ?? brandName ?? username ?? 'Felipe Rocha';
  const projectTitle =
    headline ??
    title ??
    body ??
    caption ??
    description ??
    text ??
    'Redesign de Marca — Studio Nuvem';
  const coverSrc = postImage ?? thumbnail ?? image ?? '';
  const avatarSrc = profileImage ?? '';

  const initials = resolvedName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  const displayAppreciations = appreciated
    ? appreciationCount + 1
    : appreciationCount;

  // Adobe CC tool colors
  const adobeTools = [
    { abbr: 'Ps', bg: '#001E36', accent: '#31A8FF', label: 'Photoshop' },
    { abbr: 'Ai', bg: '#330000', accent: '#FF9A00', label: 'Illustrator' },
    { abbr: 'Ae', bg: '#00005B', accent: '#9999FF', label: 'After Effects' },
  ];

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
      {/* Cover image area */}
      <div
        style={{
          width: '100%',
          height: 220,
          position: 'relative',
          overflow: 'hidden',
          background: coverSrc
            ? undefined
            : 'linear-gradient(135deg, #0057FF 0%, #4B00E0 50%, #7B2FBE 100%)',
        }}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={projectTitle}
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
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage:
                  'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.1) 0%, transparent 55%)',
              }}
            />
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.35 }}>
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#fff" strokeWidth="1.4" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#fff" />
              <path
                d="M21 15l-5-5L5 21"
                stroke="#fff"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Behance "Bē" badge top-right */}
        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: '#0057FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 900,
            color: '#fff',
            letterSpacing: -1,
            boxShadow: '0 2px 8px rgba(0,87,255,0.4)',
          }}
          title="Behance"
        >
          Bē
        </div>
      </div>

      {/* Content below cover */}
      <div style={{ padding: '14px 16px' }}>
        {/* Project title */}
        <div
          style={{
            color: '#111827',
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.3,
            marginBottom: 12,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {projectTitle}
        </div>

        {/* Creator row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0057FF 0%, #003DB3 100%)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
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
          <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>{resolvedName}</span>
          <span style={{ color: '#9CA3AF', fontSize: 11, marginLeft: 2 }}>· Criador</span>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {categories.slice(0, 3).map((cat, i) => (
            <span
              key={i}
              style={{
                background: '#EEF2FF',
                color: '#0057FF',
                border: '1px solid #C7D7FF',
                borderRadius: 20,
                padding: '4px 11px',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Stats + save row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            paddingTop: 12,
            borderTop: '1px solid #F3F4F6',
            marginBottom: 12,
          }}
        >
          {/* Appreciation heart */}
          <button
            type="button"
            aria-label={appreciated ? 'Remover curtida' : 'Curtir projeto'}
            onClick={() => setAppreciated((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 8px',
              borderRadius: 8,
              color: appreciated ? '#0057FF' : '#6B7280',
              fontSize: 13,
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={appreciated ? '#0057FF' : 'none'}
              style={{ transition: 'fill 0.15s ease' }}
            >
              <path
                d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                stroke={appreciated ? '#0057FF' : '#6B7280'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {displayAppreciations.toLocaleString('pt-BR')}
          </button>

          {/* Views */}
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
            {viewCount}
          </div>

          <div style={{ flex: 1 }} />

          {/* Save to Mood Board */}
          <button
            type="button"
            aria-label={saved ? 'Remover do Mood Board' : 'Salvar no Mood Board'}
            onClick={() => setSaved((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: saved ? '#EEF2FF' : '#0057FF',
              color: saved ? '#0057FF' : '#fff',
              border: saved ? '1.5px solid #C7D7FF' : '1.5px solid #0057FF',
              borderRadius: 20,
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={saved ? '#0057FF' : 'none'}>
              <path
                d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
                stroke={saved ? '#0057FF' : '#fff'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {saved ? 'Salvo' : 'Salvar no Mood Board'}
          </button>
        </div>

        {/* Tools used row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#9CA3AF', fontSize: 11, fontWeight: 500 }}>Ferramentas:</span>
          <div style={{ display: 'flex', gap: 6 }}>
            {adobeTools.map((tool, i) => (
              <div
                key={i}
                title={tool.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: tool.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 900,
                  color: tool.accent,
                  letterSpacing: -0.3,
                  cursor: 'default',
                  border: `1px solid ${tool.accent}33`,
                  boxShadow: `0 1px 4px ${tool.accent}22`,
                }}
              >
                {tool.abbr}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
