'use client';

import React from 'react';

interface RelatorioCapaProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  description?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioCapa: React.FC<RelatorioCapaProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  description,
  caption,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const companyName = brandName ?? name ?? username ?? 'Empresa S.A.';
  const reportTitle = headline ?? title ?? 'Relatório Anual 2024';
  const tagline = body ?? description ?? caption ??
    'Desempenho, inovação e resultados do exercício';
  const execPhoto = profileImage ?? image ?? postImage ?? thumbnail ?? '';

  // Derive a lighter version of accent for gradient
  const accentLight = `${accent}cc`;

  return (
    <div
      style={{
        position: 'relative',
        width: '420px',
        height: '594px',
        background: `linear-gradient(160deg, ${accent} 0%, ${accentLight} 55%, #0a2240 100%)`,
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Decorative diagonal overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '60%',
          height: '100%',
          background: 'rgba(255,255,255,0.03)',
          clipPath: 'polygon(40% 0%, 100% 0%, 100% 100%, 0% 100%)',
          pointerEvents: 'none',
        }}
      />
      {/* Large decorative year watermark */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '80px',
          right: '-20px',
          fontSize: '140px',
          fontWeight: 900,
          color: 'rgba(255,255,255,0.05)',
          lineHeight: 1,
          pointerEvents: 'none',
          letterSpacing: '-4px',
        }}
      >
        2024
      </div>

      {/* Top section: logo area */}
      <div style={{ padding: '32px 32px 0', flexShrink: 0 }}>
        {/* Company logo placeholder */}
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '8px',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {companyName}
        </div>
      </div>

      {/* Middle: main title area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '32px 32px 0' }}>
        {/* Year number — large */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 900,
            color: 'rgba(255,255,255,0.22)',
            lineHeight: 1,
            marginBottom: '8px',
            letterSpacing: '-2px',
          }}
        >
          2024
        </div>

        <h1
          style={{
            fontSize: '28px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.2,
            margin: '0 0 12px',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          {reportTitle}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {tagline}
        </p>
      </div>

      {/* Executive photo area */}
      <div style={{ padding: '24px 32px', display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
        {execPhoto ? (
          <img
            src={execPhoto}
            alt="Executivo"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.5)',
            }}
          />
        ) : (
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(255,255,255,0.7)" aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>
            Carlos Mendes
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)' }}>Diretor Executivo</div>
        </div>
      </div>

      {/* Bottom color strip */}
      <div
        style={{
          height: '6px',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 100%)',
          flexShrink: 0,
        }}
      />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.25)',
        }}
      >
        Capa
      </div>
    </div>
  );
};
