'use client';

import React from 'react';

interface SlideAulaCapaProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const SlideAulaCapa: React.FC<SlideAulaCapaProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Introdução ao Cálculo Diferencial';
  const resolvedSubtitle = description ?? caption ?? 'Fundamentos, limites e derivadas';
  const resolvedProfessor = name ?? username ?? 'Prof. Dr. Ricardo Lima';
  const resolvedInstitution = brandName ?? 'Universidade EduTech';
  const resolvedDate = body ?? text ?? 'Março de 2025';
  const accent = brandColor;

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        fontFamily: 'system-ui, sans-serif',
        background: '#0f172a',
        display: 'flex',
      }}
    >
      {/* Left color panel */}
      <div
        style={{
          width: '8px',
          background: accent,
          flexShrink: 0,
        }}
      />

      {/* Left content column */}
      <div
        style={{
          flex: 1,
          padding: '36px 32px 28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Institution badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: `${accent}20`,
            border: `1px solid ${accent}40`,
            borderRadius: '4px',
            padding: '5px 12px',
            alignSelf: 'flex-start',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          <span style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {resolvedInstitution}
          </span>
        </div>

        {/* Title block */}
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1.15,
              marginBottom: '10px',
            }}
          >
            {resolvedTitle}
          </h1>
          <div
            style={{
              width: '48px',
              height: '3px',
              background: accent,
              borderRadius: '2px',
              marginBottom: '10px',
            }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            {resolvedSubtitle}
          </p>
        </div>

        {/* Footer info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: '14px',
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
              Responsável
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{resolvedProfessor}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '9px', color: '#475569', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
              Data
            </div>
            <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600 }}>{resolvedDate}</div>
          </div>
        </div>
      </div>

      {/* Right decorative column */}
      <div
        style={{
          width: '140px',
          flexShrink: 0,
          background: `linear-gradient(160deg, ${accent}18 0%, ${accent}05 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: `1px solid ${accent}15`,
        }}
      >
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="0.7" opacity="0.3">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      </div>

      {/* Slide number */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '12px',
          fontSize: '10px',
          color: '#334155',
          fontWeight: 700,
        }}
      >
        01
      </div>
    </div>
  );
};
