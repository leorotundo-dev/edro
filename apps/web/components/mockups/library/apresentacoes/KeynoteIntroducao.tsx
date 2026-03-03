'use client';

import React from 'react';

interface KeynoteIntroducaoProps {
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
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteIntroducao: React.FC<KeynoteIntroducaoProps> = ({
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
  brandColor,
  themeColor,
}) => {
  const accent = brandColor ?? themeColor ?? '#6366F1';
  const resolvedName = name ?? username ?? 'Ana Beatriz Costa';
  const resolvedTitle = title ?? headline ?? 'Diretora de Estratégia';
  const resolvedCompany = brandName ?? 'Empresa S.A.';
  const resolvedBio = body ?? caption ?? description ?? text ?? 'Profissional com mais de 15 anos de experiência em gestão estratégica, inovação corporativa e transformação digital de grandes organizações.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const credentials = [
    { icon: '🎓', label: 'MBA em Gestão', detail: 'FGV — 2012' },
    { icon: '🏆', label: 'Premiação Excelência', detail: 'Top 50 Líderes 2023' },
    { icon: '🌍', label: 'Projetos Globais', detail: '12 países, 200+ entregas' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#f8f9fc',
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${accent}, ${accent}60)` }} />

      {/* Section label top-left */}
      <div
        style={{
          position: 'absolute',
          top: '18px',
          left: '24px',
          fontSize: '9px',
          fontWeight: 700,
          color: accent,
          letterSpacing: '2px',
          textTransform: 'uppercase',
        }}
      >
        Quem somos
      </div>

      {/* Left: Bio card */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '24px',
          width: '190px',
          bottom: '24px',
          background: '#fff',
          borderRadius: '10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 12px',
          border: `1px solid ${accent}20`,
        }}
      >
        {/* Photo circle */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${accent}, ${accent}80)`,
            border: `3px solid ${accent}`,
            overflow: 'hidden',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 800,
            color: '#fff',
            boxShadow: `0 0 0 4px ${accent}20`,
          }}
        >
          {resolvedImage
            ? <img src={resolvedImage} alt={resolvedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : resolvedName.charAt(0).toUpperCase()
          }
        </div>

        <div style={{ fontSize: '13px', fontWeight: 800, color: '#1a1a2e', marginBottom: '2px', textAlign: 'center' }}>
          {resolvedName}
        </div>
        <div style={{ fontSize: '10px', fontWeight: 600, color: accent, marginBottom: '2px', textAlign: 'center' }}>
          {resolvedTitle}
        </div>
        <div style={{ fontSize: '9px', color: '#888', marginBottom: '10px', textAlign: 'center' }}>
          {resolvedCompany}
        </div>

        {/* Divider */}
        <div style={{ width: '40px', height: '1px', background: `${accent}40`, marginBottom: '10px' }} />

        <p style={{ fontSize: '9px', color: '#666', lineHeight: 1.5, textAlign: 'center', margin: 0 }}>
          {resolvedBio}
        </p>
      </div>

      {/* Right: Credentials */}
      <div
        style={{
          position: 'absolute',
          top: '36px',
          left: '230px',
          right: '24px',
          bottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 800, color: '#1a1a2e', marginBottom: '4px' }}>
          Destaques da carreira
        </div>

        {credentials.map((cred, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: '#fff',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
              border: `1px solid ${accent}15`,
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `${accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                flexShrink: 0,
              }}
            >
              {cred.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1a1a2e' }}>{cred.label}</div>
              <div style={{ fontSize: '9px', color: '#888', marginTop: '1px' }}>{cred.detail}</div>
            </div>
            {/* Accent dot */}
            <div
              style={{
                marginLeft: 'auto',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: accent,
                opacity: 0.5,
              }}
            />
          </div>
        ))}

        {/* Social row */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          {['LinkedIn', 'Twitter', 'Site'].map((s) => (
            <div
              key={s}
              style={{
                fontSize: '8px',
                fontWeight: 600,
                color: accent,
                background: `${accent}15`,
                borderRadius: '20px',
                padding: '3px 8px',
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Slide number */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '18px',
          fontSize: '10px',
          color: '#bbb',
          fontWeight: 500,
        }}
      >
        03
      </div>
    </div>
  );
};
