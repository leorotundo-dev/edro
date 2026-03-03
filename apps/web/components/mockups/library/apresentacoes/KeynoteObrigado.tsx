'use client';

import React from 'react';

interface KeynoteObrigadoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  profileImage?: string;
  image?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteObrigado: React.FC<KeynoteObrigadoProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  profileImage,
  image,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const presenterName = name ?? username ?? brandName ?? 'Maria Silva';
  const presenterRole = headline ?? title ?? 'Diretora de Inovação';
  const email = body ?? text ?? caption ?? description ?? 'maria@empresa.com.br';
  const avatar = profileImage ?? image ?? '';

  const socialLinks = [
    {
      label: 'LinkedIn',
      path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
    },
    {
      label: 'Instagram',
      path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    },
    {
      label: 'Twitter / X',
      path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
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
      {/* Background decorative circles */}
      <div aria-hidden="true" style={{ position: 'absolute', top: '-50px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
      <div aria-hidden="true" style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '220px', height: '220px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

      {/* Main "Obrigado!" text */}
      <h1
        style={{
          fontSize: '52px',
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 4px',
          lineHeight: 1,
          textShadow: '0 2px 12px rgba(0,0,0,0.15)',
        }}
      >
        Obrigado!
      </h1>

      {/* Divider */}
      <div style={{ width: '50px', height: '2px', background: 'rgba(255,255,255,0.5)', borderRadius: '2px', margin: '12px auto 16px' }} />

      {/* Presenter info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        {avatar ? (
          <img
            src={avatar}
            alt={presenterName}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.7)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
        )}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff', lineHeight: 1.3 }}>{presenterName}</div>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>{presenterRole}</div>
        </div>
      </div>

      {/* Email */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '20px',
          padding: '5px 16px',
          marginBottom: '16px',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" aria-hidden="true">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M22 6l-10 7L2 6" />
        </svg>
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{email}</span>
      </div>

      {/* QR code placeholder */}
      <div
        style={{
          position: 'absolute',
          right: '24px',
          bottom: '20px',
          width: '52px',
          height: '52px',
          background: '#ffffff',
          borderRadius: '6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1px',
          padding: '4px',
        }}
        aria-label="QR Code"
      >
        {/* Simple QR placeholder pattern */}
        {[0,1,2,3,4].map((row) => (
          <div key={row} style={{ display: 'flex', gap: '1px' }}>
            {[0,1,2,3,4].map((col) => (
              <div
                key={col}
                style={{
                  width: '7px',
                  height: '7px',
                  background: ((row + col) % 3 === 0 || (row === 0 && col < 3) || (row < 3 && col === 0)) ? accent : '#e5e7eb',
                  borderRadius: '1px',
                }}
              />
            ))}
          </div>
        ))}
        <div style={{ fontSize: '5px', color: '#9ca3af', marginTop: '2px' }}>QR Code</div>
      </div>

      {/* Social icons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {socialLinks.map((icon) => (
          <button
            key={icon.label}
            type="button"
            aria-label={icon.label}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '1px solid rgba(255,255,255,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'default',
              padding: 0,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)" aria-hidden="true">
              <path d={icon.path} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};
