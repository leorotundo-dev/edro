'use client';

import React, { useState } from 'react';

interface FacebookCoverProps {
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

const TABS = ['Publicações', 'Sobre', 'Amigos', 'Fotos', 'Vídeos', 'Mais'];

export const FacebookCover: React.FC<FacebookCoverProps> = ({
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
  const [activeTab, setActiveTab] = useState(0);
  const [following, setFollowing] = useState(false);

  const resolvedName = brandName ?? name ?? username ?? headline ?? title ?? 'Nome da Página';
  const resolvedBio = body ?? caption ?? description ?? text ?? 'Bem-vindo à nossa página oficial. Siga-nos para novidades!';
  const resolvedCover = image ?? postImage ?? thumbnail ?? '';
  const resolvedAvatar = profileImage ?? '';
  const resolvedColor = brandColor ?? '#1877f2';

  return (
    <div style={{
      width: 720,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fb-cov-fade { from { opacity:0; } to { opacity:1; } }
        .fb-cov-root { animation: fb-cov-fade 0.35s ease; }
        .fb-cov-tab-btn:hover { background: #f0f2f5 !important; }
        .fb-cov-follow-btn:hover { filter: brightness(0.90); }
        .fb-cov-msg-btn:hover { background: #e4e6eb !important; }
        .fb-cov-cover-edit:hover { opacity: 1 !important; }
      `}</style>

      <div className="fb-cov-root">
        {/* Cover photo — 820×312 ratio ≈ 720×270 scaled */}
        <div style={{
          width: '100%',
          height: 270,
          background: resolvedCover
            ? 'transparent'
            : `linear-gradient(135deg, ${resolvedColor}33 0%, ${resolvedColor}88 100%)`,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {resolvedCover
            ? <img src={resolvedCover} alt="Capa" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : (
              <div style={{
                width: '100%', height: '100%',
                background: `linear-gradient(135deg, ${resolvedColor}22 0%, ${resolvedColor}66 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={resolvedColor} strokeWidth="1.2" style={{ opacity: 0.4 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
            )
          }
          {/* Edit cover button */}
          <button
            type="button"
            aria-label="Editar foto da capa"
            className="fb-cov-cover-edit"
            style={{
              position: 'absolute', bottom: 12, right: 12,
              background: 'rgba(255,255,255,0.90)', border: '1px solid #e4e6eb',
              borderRadius: 6, padding: '6px 12px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', color: '#050505', opacity: 0.85, transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar capa
          </button>
        </div>

        {/* Profile section */}
        <div style={{ position: 'relative', padding: '0 24px 0' }}>
          {/* Avatar — overlaps cover */}
          <div style={{
            position: 'absolute',
            top: -52,
            left: 24,
            width: 104,
            height: 104,
            borderRadius: '50%',
            border: '4px solid #fff',
            background: resolvedAvatar ? 'transparent' : resolvedColor,
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {resolvedAvatar
              ? <img src={resolvedAvatar} alt={resolvedName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: '#fff', fontWeight: 800, fontSize: 36 }}>{resolvedName.charAt(0).toUpperCase()}</span>
            }
          </div>

          {/* Name + stats row */}
          <div style={{ paddingTop: 60, paddingBottom: 12, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#050505', lineHeight: 1.2 }}>{resolvedName}</div>
              <div style={{ fontSize: 13, color: '#65676b', marginTop: 3 }}>
                <span style={{ fontWeight: 600, color: '#050505' }}>24.832</span> seguidores
                &nbsp;·&nbsp;
                <span style={{ fontWeight: 600, color: '#050505' }}>18.410</span> curtidas
              </div>
              {resolvedBio && (
                <div style={{ fontSize: 14, color: '#65676b', marginTop: 6, maxWidth: 380, lineHeight: 1.4 }}>
                  {resolvedBio}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button
                type="button"
                aria-label={following ? 'Deixar de seguir' : 'Seguir página'}
                className="fb-cov-follow-btn"
                onClick={() => setFollowing((p) => !p)}
                style={{
                  background: following ? '#e4e6eb' : resolvedColor,
                  color: following ? '#050505' : '#fff',
                  border: 'none', borderRadius: 6,
                  padding: '8px 16px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'filter 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {following ? '✓ Seguindo' : '+ Seguir'}
              </button>
              <button
                type="button"
                aria-label="Enviar mensagem"
                className="fb-cov-msg-btn"
                style={{
                  background: '#e4e6eb', color: '#050505', border: 'none',
                  borderRadius: 6, padding: '8px 16px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#050505" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                Mensagem
              </button>
              <button
                type="button"
                aria-label="Mais opções"
                className="fb-cov-msg-btn"
                style={{
                  background: '#e4e6eb', color: '#050505', border: 'none',
                  borderRadius: 6, padding: '8px 12px', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                ···
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#e4e6eb', margin: '0 24px' }} />

        {/* Tab bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px', overflowX: 'auto' }}>
          {TABS.map((tab, i) => (
            <button
              key={tab}
              type="button"
              aria-label={`Aba ${tab}`}
              className="fb-cov-tab-btn"
              onClick={() => setActiveTab(i)}
              style={{
                padding: '14px 14px',
                background: 'none',
                border: 'none',
                borderBottom: i === activeTab ? `3px solid ${resolvedColor}` : '3px solid transparent',
                color: i === activeTab ? resolvedColor : '#65676b',
                fontSize: 14,
                fontWeight: i === activeTab ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'background 0.15s',
                borderRadius: '6px 6px 0 0',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
