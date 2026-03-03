'use client';

import React, { useState } from 'react';

interface LinkedInProfileProps {
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
  headline?: string;
  title?: string;
  company?: string;
  school?: string;
  location?: string;
  connectionCount?: string | number;
  followerCount?: string | number;
  connectionDegree?: '1º' | '2º' | '3º';
  isVerified?: boolean;
  skills?: string[];
}

export const LinkedInProfile: React.FC<LinkedInProfileProps> = ({
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
  company = 'Empresa ABC',
  school = 'Universidade XYZ',
  location = 'São Paulo, Brasil',
  connectionCount = 500,
  followerCount = 1842,
  connectionDegree = '2º',
  isVerified = false,
  skills = ['Marketing Digital', 'Estratégia de Conteúdo', 'Liderança'],
}) => {
  const [connected, setConnected] = useState(false);

  const resolvedName = name ?? brandName ?? username ?? 'Nome Completo';
  const resolvedHeadline =
    headline ??
    title ??
    body ??
    caption ??
    description ??
    text ??
    'Especialista em Marketing Digital | Criação de Conteúdo | Palestrante';
  const coverImage = postImage ?? thumbnail ?? '';
  const avatarSrc = profileImage ?? image ?? '';

  const connCount =
    typeof connectionCount === 'number'
      ? connectionCount >= 500
        ? '500+'
        : connectionCount.toLocaleString('pt-BR')
      : connectionCount;

  const follCount =
    typeof followerCount === 'number'
      ? followerCount >= 1000
        ? `${(followerCount / 1000).toFixed(1).replace('.', ',')} mil`
        : followerCount.toLocaleString('pt-BR')
      : followerCount;

  const authorInitials = resolvedName
    .split(' ')
    .slice(0, 2)
    .map((w: string) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      style={{
        width: 360,
        background: '#fff',
        borderRadius: 10,
        border: '1px solid #E0E0E0',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      {/* Cover photo strip */}
      <div
        style={{
          width: '100%',
          height: 120,
          background: coverImage
            ? undefined
            : 'linear-gradient(135deg, #0A66C2 0%, #004182 50%, #00294F 100%)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {coverImage && (
          <img
            src={coverImage}
            alt="Capa do perfil"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        )}
        {/* Subtle pattern overlay */}
        {!coverImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 16px)',
            }}
          />
        )}
      </div>

      {/* Profile section */}
      <div style={{ padding: '0 18px 16px', position: 'relative' }}>
        {/* Avatar overlapping cover */}
        <div
          style={{
            position: 'absolute',
            top: -40,
            left: 18,
            width: 80,
            height: 80,
            borderRadius: '50%',
            border: '3px solid #fff',
            background: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            fontWeight: 700,
            color: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={resolvedName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            authorInitials
          )}
        </div>

        {/* Space for avatar overlap */}
        <div style={{ height: 46 }} />

        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
          <span
            style={{
              color: '#191919',
              fontSize: 20,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            {resolvedName}
          </span>

          {/* Degree badge */}
          <span
            style={{
              fontSize: 12,
              color: '#5E5E5E',
              fontWeight: 400,
            }}
          >
            · {connectionDegree}
          </span>

          {/* Verified badge */}
          {isVerified && (
            <span
              title="Perfil verificado"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0A66C2',
                borderRadius: '50%',
                width: 16,
                height: 16,
                fontSize: 9,
                color: '#fff',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              ✓
            </span>
          )}
        </div>

        {/* Headline */}
        <p
          style={{
            color: '#313335',
            fontSize: 13.5,
            lineHeight: '1.45',
            margin: '0 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {resolvedHeadline}
        </p>

        {/* Company + School row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 8 }}>
          {company && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5E5E', fontSize: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 21h18M3 7v14M21 7v14M6 11v2M6 15v2M10 11v2M10 15v2M14 11v2M14 15v2M18 11v2M18 15v2M3 7l9-4 9 4"
                  stroke="#5E5E5E"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{company}</span>
            </div>
          )}
          {school && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#5E5E5E', fontSize: 12 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"
                  stroke="#5E5E5E"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 12v5c3.33 2 8.67 2 12 0v-5"
                  stroke="#5E5E5E"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{school}</span>
            </div>
          )}
        </div>

        {/* Location + connections */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#5E5E5E', fontSize: 12 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"
                stroke="#5E5E5E"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="10" r="3" stroke="#5E5E5E" strokeWidth="1.8" />
            </svg>
            {location}
          </div>
          <span style={{ color: '#D0D0D0', fontSize: 12 }}>·</span>
          <span style={{ color: '#0A66C2', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {connCount} conexões
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setConnected((v) => !v)}
            style={{
              background: connected ? '#fff' : '#0A66C2',
              color: connected ? '#0A66C2' : '#fff',
              border: connected ? '1.5px solid #0A66C2' : '1.5px solid #0A66C2',
              borderRadius: 20,
              padding: '7px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
          >
            {connected ? '✓ Conectado' : '+ Conectar'}
          </button>

          <button
            type="button"
            style={{
              background: '#fff',
              color: '#0A66C2',
              border: '1.5px solid #0A66C2',
              borderRadius: 20,
              padding: '7px 18px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Mensagem
          </button>

          <button
            type="button"
            style={{
              background: '#fff',
              color: '#5E5E5E',
              border: '1.5px solid #C0C0C0',
              borderRadius: 20,
              padding: '7px 13px',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ···
          </button>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderTop: '1px solid #F0F0F0',
            borderBottom: '1px solid #F0F0F0',
            padding: '10px 0',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              textAlign: 'center',
              borderRight: '1px solid #F0F0F0',
              padding: '2px 0',
            }}
          >
            <div style={{ color: '#191919', fontSize: 14, fontWeight: 700 }}>{connCount}</div>
            <div style={{ color: '#5E5E5E', fontSize: 11, marginTop: 1 }}>Conexões</div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', padding: '2px 0' }}>
            <div style={{ color: '#191919', fontSize: 14, fontWeight: 700 }}>{follCount}</div>
            <div style={{ color: '#5E5E5E', fontSize: 11, marginTop: 1 }}>Seguidores</div>
          </div>
        </div>

        {/* Skills preview */}
        {skills && skills.length > 0 && (
          <div>
            <div
              style={{
                color: '#5E5E5E',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Competências
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {skills.slice(0, 3).map((skill, i) => (
                <span
                  key={i}
                  style={{
                    background: '#EAF0FB',
                    color: '#0A66C2',
                    borderRadius: 14,
                    padding: '4px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    border: '1px solid #C8D8F0',
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
