'use client';

import React, { useState } from 'react';

interface GoogleBanner300x600Props {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

export const GoogleBanner300x600: React.FC<GoogleBanner300x600Props> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  brandName,
}) => {
  const [clicked, setClicked] = useState(false);
  const [hovered, setHovered] = useState(false);

  const resolvedBrand = brandName ?? name ?? username ?? 'Minha Marca';
  const resolvedHeadline = headline ?? title ?? 'Transforme Seu Negócio Hoje Mesmo';
  const resolvedSubhead = body ?? caption ?? description ?? text ?? 'Plataforma completa com todas as ferramentas que você precisa para crescer no digital.';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedLogo = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1a73e8';

  const FEATURES = ['Fácil de usar', 'Suporte 24/7', 'Resultados rápidos'];

  return (
    <div
      style={{
        width: 300,
        height: 600,
        background: '#fff',
        border: '1px solid #dadce0',
        borderRadius: 4,
        overflow: 'hidden',
        fontFamily: 'Google Sans, Arial, sans-serif',
        position: 'relative',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.18)' : '0 1px 4px rgba(0,0,0,0.10)',
        transition: 'box-shadow 0.2s',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{`
        @keyframes ggl-300x600-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .ggl-300x600-arrow { animation: ggl-300x600-bob 1.8s ease-in-out infinite; }
        .ggl-300x600-cta:hover { filter: brightness(0.90); }
        .ggl-300x600-feat { transition: background 0.15s; }
        .ggl-300x600-feat:hover { background: #f8f9fa !important; }
      `}</style>

      {/* Ad label */}
      <div style={{ position: 'absolute', top: 6, left: 8, zIndex: 10, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.55)', borderRadius: 3, padding: '1px 5px', fontWeight: 600 }}>
        Anúncio
      </div>

      {/* Top brand bar */}
      <div style={{ background: resolvedColor, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {resolvedLogo
          ? <img src={resolvedLogo} alt={resolvedBrand} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
          : (
            <div style={{ width: 32, height: 32, borderRadius: 4, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>{resolvedBrand.charAt(0)}</span>
            </div>
          )
        }
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>{resolvedBrand}</div>
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>minhamarca.com.br</div>
        </div>
      </div>

      {/* Image area */}
      <div style={{
        height: 240, width: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0,
        background: resolvedImage ? 'transparent' : `linear-gradient(160deg, ${resolvedColor}18 0%, ${resolvedColor}44 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {resolvedImage
          ? <img src={resolvedImage} alt={resolvedHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : (
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={resolvedColor} strokeWidth="1" style={{ opacity: 0.3 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )
        }
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: resolvedColor }} />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, padding: '16px 16px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* Headline */}
        <div style={{ fontSize: 18, fontWeight: 800, color: '#202124', lineHeight: 1.25, marginBottom: 10 }}>
          {resolvedHeadline}
        </div>

        {/* Description */}
        <div style={{ fontSize: 13, color: '#5f6368', lineHeight: 1.5, marginBottom: 14 }}>
          {resolvedSubhead}
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          {FEATURES.map((feat, i) => (
            <div key={i} className="ggl-300x600-feat" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: '#f8f9fa' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: resolvedColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              </div>
              <span style={{ fontSize: 12, color: '#202124', fontWeight: 500 }}>{feat}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label="Começar agora"
          className="ggl-300x600-cta"
          onClick={() => setClicked(true)}
          style={{
            width: '100%', background: clicked ? '#1557b0' : resolvedColor,
            color: '#fff', border: 'none', borderRadius: 4,
            padding: '12px 0', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', transition: 'filter 0.15s, background 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {clicked ? 'Redirecionando…' : (
            <>
              Começar agora
              <span className="ggl-300x600-arrow" style={{ display: 'inline-flex' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </span>
            </>
          )}
        </button>

        {/* Legal / URL */}
        <div style={{ marginTop: 10, fontSize: 10, color: '#9aa0a6', textAlign: 'center' }}>
          minhamarca.com.br · Termos aplicam-se
        </div>
      </div>
    </div>
  );
};
