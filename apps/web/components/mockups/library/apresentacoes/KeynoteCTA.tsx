'use client';

import React from 'react';

interface KeynoteCTAProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteCTA: React.FC<KeynoteCTAProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const ctaText = headline ?? title ?? 'Comece agora e transforme seus resultados';
  const subText = body ?? text ?? caption ?? description ??
    'Junte-se a mais de 10.000 empresas que já confiam em nós.';
  const website = name ?? username ?? brandName ?? 'www.suaempresa.com.br';

  const socialIcons = [
    {
      label: 'Instagram',
      path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    },
    {
      label: 'LinkedIn',
      path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    },
    {
      label: 'YouTube',
      path: 'M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: `linear-gradient(140deg, ${accent}12 0%, #fff 55%)`,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        textAlign: 'center',
        padding: '28px 48px',
      }}
    >
      {/* Decorative circles */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', borderRadius: '50%', background: `${accent}0e`, pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: `${accent}0a`, pointerEvents: 'none' }} />

      {/* Badge */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          background: `${accent}18`,
          border: `1px solid ${accent}40`,
          borderRadius: '20px',
          padding: '3px 12px',
          marginBottom: '14px',
        }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
        <span style={{ fontSize: '9px', fontWeight: 700, color: accent, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Oferta Especial
        </span>
      </div>

      {/* CTA headline */}
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 900,
          color: '#111827',
          lineHeight: 1.25,
          margin: '0 0 10px',
          maxWidth: '370px',
        }}
      >
        {ctaText}
      </h2>

      {/* Sub text */}
      <p
        style={{
          fontSize: '11px',
          color: '#6b7280',
          margin: '0 0 18px',
          maxWidth: '300px',
          lineHeight: 1.5,
        }}
      >
        {subText}
      </p>

      {/* CTA button mockup */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: accent,
          color: '#fff',
          padding: '11px 26px',
          borderRadius: '8px',
          fontWeight: 700,
          fontSize: '12px',
          marginBottom: '16px',
          boxShadow: `0 4px 14px ${accent}44`,
        }}
      >
        Experimente Grátis
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>

      {/* Website URL */}
      <div style={{ fontSize: '10px', color: accent, fontWeight: 600, marginBottom: '12px', letterSpacing: '0.2px' }}>
        {website}
      </div>

      {/* Social icons row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {socialIcons.map((icon) => (
          <button
            key={icon.label}
            type="button"
            aria-label={icon.label}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: `${accent}12`,
              border: `1px solid ${accent}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
              <path d={icon.path} />
            </svg>
          </button>
        ))}
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        CTA
      </div>
    </div>
  );
};
