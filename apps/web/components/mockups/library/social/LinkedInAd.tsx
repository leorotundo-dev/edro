'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface LinkedInAdProps {
  // Identity
  name?: string;
  username?: string;
  brandName?: string;
  companyName?: string;
  companyLogo?: string;
  profileImage?: string;
  thumbnail?: string;
  // Content
  headline?: string;
  title?: string;
  body?: string;
  description?: string;
  text?: string;
  caption?: string;
  // Media
  postImage?: string;
  image?: string;
  adImage?: string;
  // Website preview card
  ctaText?: string;
  websiteDomain?: string;
  websiteTitle?: string;
  websiteImage?: string;
  // Metrics
  likeCount?: number | string;
  likes?: number | string;
  followers?: string;
}

const LI_BLUE = '#0A66C2';
const LI_GRAY = '#666666';
const LI_BG = '#F3F2EF';
const LI_TEXT = 'rgba(0,0,0,0.9)';
const LI_TEXT_MUTED = 'rgba(0,0,0,0.60)';
const LI_BORDER = '#E0DFDC';

export const LinkedInAd: React.FC<LinkedInAdProps> = ({
  name,
  username,
  brandName,
  companyName,
  companyLogo,
  profileImage,
  thumbnail,
  headline,
  title,
  body,
  description,
  text,
  caption,
  postImage,
  image,
  adImage,
  ctaText = 'Saiba Mais',
  websiteDomain = 'empresa.com.br',
  websiteTitle,
  websiteImage,
  likeCount,
  likes,
  followers = '12.847 seguidores',
}) => {
  const [dismissed, setDismissed] = useState(false);

  const displayName = companyName || brandName || name || username || 'Nome da Empresa';
  const displayLogo = companyLogo || profileImage || thumbnail || '';
  const displayAdImage = adImage || postImage || image || '';
  const displayHeadline = headline || title || 'Acelere o crescimento da sua empresa';
  const displayBody = body || description || text || caption || 'Veja como líderes do setor estão alcançando resultados extraordinários com nossa solução.';
  const displayWebsiteTitle = websiteTitle || displayHeadline;

  const rawLikes = likeCount ?? likes ?? 847;
  const likesLabel = typeof rawLikes === 'number' ? rawLikes.toLocaleString('pt-BR') : String(rawLikes);

  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  if (dismissed) return null;

  const actionBtnStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: LI_TEXT_MUTED,
    padding: '10px 4px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 4,
    fontFamily,
  };

  return (
    <div
      style={{
        width: 420,
        maxWidth: '100%',
        background: '#FFFFFF',
        borderRadius: 8,
        border: `1px solid ${LI_BORDER}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily,
        color: LI_TEXT,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Company logo */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 4,
              overflow: 'hidden',
              background: '#E9E5DF',
              border: '1px solid rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}
          >
            {displayLogo ? (
              <img src={displayLogo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, ${LI_BLUE} 0%, #004182 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M20.47 2H3.53A1.53 1.53 0 0 0 2 3.53v16.94A1.53 1.53 0 0 0 3.53 22h16.94A1.53 1.53 0 0 0 22 20.47V3.53A1.53 1.53 0 0 0 20.47 2zM8.09 18.74H5V9.64h3.09zM6.54 8.28A1.79 1.79 0 1 1 8.34 6.5a1.79 1.79 0 0 1-1.8 1.78zm12.2 10.46h-3.09v-4.95c0-1.26-.5-2.12-1.65-2.12a1.73 1.73 0 0 0-1.63 1.18 2.24 2.24 0 0 0-.08.76v5.13h-3.1v-9.1h3.1v1.35a3.08 3.08 0 0 1 2.81-1.55c2 0 3.56 1.35 3.56 4.26z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT, margin: 0, lineHeight: '20px' }}>{displayName}</p>
            <p style={{ fontSize: 12, color: LI_GRAY, margin: '1px 0', lineHeight: '16px' }}>{followers}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Globe icon */}
              <svg width="11" height="11" viewBox="0 0 16 16" fill={LI_GRAY}>
                <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2.5 8.5h2c.1 1 .3 2 .7 2.8A5.5 5.5 0 0 1 2.5 8.5zm2-1h-2A5.5 5.5 0 0 1 5.2 4.7c-.4.8-.6 1.8-.7 2.8zm1 0c.1-1.2.5-2.2 1-2.9.4-.5.7-.6 1-.6s.6.1 1 .6c.5.7.9 1.7 1 2.9H5.5zm0 1h4c-.1 1.2-.5 2.2-1 2.9-.4.5-.7.6-1 .6s-.6-.1-1-.6c-.5-.7-.9-1.7-1-2.9zm5 0h2A5.5 5.5 0 0 1 10.8 11.3c.4-.8.6-1.8.7-2.8zm0-1c-.1-1-.3-2-.7-2.8A5.5 5.5 0 0 1 13.5 7.5h-2z" />
              </svg>
              <span style={{ fontSize: 11, color: LI_GRAY, fontWeight: 500 }}>Promovido</span>
            </div>
          </div>
        </div>

        {/* X Fechar */}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Fechar anúncio"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: LI_TEXT_MUTED,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 4,
            fontFamily,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
          Fechar
        </button>
      </div>

      {/* ── Post body text ── */}
      {displayBody ? (
        <div style={{ padding: '0 16px 10px', fontSize: 14, lineHeight: 1.5, color: LI_TEXT }}>
          <p
            style={{
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayBody}
          </p>
        </div>
      ) : null}

      {/* ── Ad image ── */}
      {displayAdImage ? (
        <img
          src={displayAdImage}
          alt="Imagem do anúncio"
          style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
        />
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '1.91/1',
            background: `linear-gradient(135deg, #E9E5DF 0%, #d6d3cc 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#999' }}>Imagem do anúncio</span>
        </div>
      )}

      {/* ── Website preview card ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          background: LI_BG,
          borderTop: `1px solid ${LI_BORDER}`,
          padding: '10px 12px',
          gap: 12,
        }}
      >
        {/* Website thumbnail (80×80) */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 4,
            overflow: 'hidden',
            flexShrink: 0,
            background: '#D0E8FF',
            border: `1px solid ${LI_BORDER}`,
          }}
        >
          {websiteImage ? (
            <img src={websiteImage} alt="Site" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${LI_BLUE}22 0%, ${LI_BLUE}44 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill={LI_BLUE}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
          )}
        </div>

        {/* Text + CTA */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, color: LI_GRAY, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {websiteDomain}
          </p>
          <p
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: LI_TEXT,
              margin: '0 0 6px',
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayWebsiteTitle}
          </p>
          <button
            type="button"
            style={{
              background: LI_BLUE,
              border: 'none',
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              borderRadius: 24,
              padding: '6px 16px',
              cursor: 'pointer',
              fontFamily,
            }}
          >
            {ctaText}
          </button>
        </div>
      </div>

      {/* ── Reaction summary ── */}
      <div
        style={{
          padding: '8px 16px',
          fontSize: 12,
          color: LI_TEXT_MUTED,
          borderBottom: `1px solid ${LI_BORDER}`,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <div style={{ display: 'flex' }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: LI_BLUE,
              border: '1.5px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10 }}>👍</span>
          </div>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#DF704D',
              border: '1.5px solid white',
              marginLeft: -4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 10 }}>❤️</span>
          </div>
        </div>
        <span>{likesLabel} reações</span>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
        {[
          {
            label: 'Curtir',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
            ),
          },
          {
            label: 'Comentar',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            ),
          },
          {
            label: 'Repostar',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            ),
          },
          {
            label: 'Enviar',
            icon: (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            ),
          },
        ].map(({ label, icon }) => (
          <button
            key={label}
            type="button"
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: LI_TEXT_MUTED,
              padding: '10px 4px',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 4,
              fontFamily,
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
