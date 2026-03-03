'use client';

import React, { useState } from 'react';

interface FacebookGroupProps {
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
  memberCount?: number | string;
  postsPerDay?: number;
  isPrivate?: boolean;
  pinnedPost?: string;
}

export const FacebookGroup: React.FC<FacebookGroupProps> = ({
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
  memberCount = 14800,
  postsPerDay = 23,
  isPrivate = false,
  pinnedPost,
}) => {
  const [joined, setJoined] = useState(false);
  const [activeTab, setActiveTab] = useState<'Discussão' | 'Destaque' | 'Membros' | 'Eventos'>('Discussão');

  const resolvedName = headline ?? title ?? name ?? brandName ?? 'Nome do Grupo';
  const resolvedDescription = body ?? caption ?? description ?? text ?? '';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const resolvedPinned = pinnedPost ?? resolvedDescription ?? 'Post fixado pelo administrador do grupo.';

  const formattedCount = typeof memberCount === 'number'
    ? memberCount >= 1000
      ? `${(memberCount / 1000).toFixed(1).replace('.', ',')} mil`
      : memberCount.toString()
    : memberCount;

  const tabs = ['Discussão', 'Destaque', 'Membros', 'Eventos'] as const;

  return (
    <div style={{
      width: 400,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fbg-shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .fbg-cover-shimmer {
          background: linear-gradient(90deg, #e4e6eb 25%, #f0f2f5 50%, #e4e6eb 75%);
          background-size: 800px 100%;
          animation: fbg-shimmer 1.5s infinite linear;
        }
        .fbg-join-btn:hover { filter: brightness(0.92); }
        .fbg-tab-btn:hover { background: rgba(0,0,0,0.05); }
      `}</style>

      {/* Cover photo */}
      <div style={{ position: 'relative', width: '100%', height: 180 }}>
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={resolvedName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            className="fbg-cover-shimmer"
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </div>

      {/* Group info */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#050505', lineHeight: 1.2 }}>
              {resolvedName}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {/* Privacy badge */}
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 13,
                color: '#65676b',
              }}>
                {isPrivate ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Grupo privado
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Grupo público
                  </>
                )}
              </span>
              <span style={{ color: '#65676b', fontSize: 13 }}>·</span>
              <span style={{ color: '#65676b', fontSize: 13 }}>
                <strong style={{ color: '#050505' }}>{formattedCount}</strong> membros
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#65676b' }}>
              {postsPerDay} publicações por dia
            </p>
          </div>

          {/* Join button */}
          <button
            type="button"
            aria-label={joined ? 'Sair do grupo' : 'Entrar no grupo'}
            className="fbg-join-btn"
            onClick={() => setJoined((v) => !v)}
            style={{
              flexShrink: 0,
              padding: '8px 16px',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              background: joined ? '#e4e6eb' : '#1877f2',
              color: joined ? '#050505' : '#fff',
              transition: 'background 0.15s',
            }}
          >
            {joined ? '✓ Membro' : '+ Entrar no grupo'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e4e6eb', marginTop: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-label={`Aba ${tab}`}
              className="fbg-tab-btn"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: activeTab === tab ? '#1877f2' : '#65676b',
                borderBottom: activeTab === tab ? '3px solid #1877f2' : '3px solid transparent',
                marginBottom: -1,
                transition: 'color 0.15s',
                borderRadius: '4px 4px 0 0',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned post preview */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{
          background: '#f0f2f5',
          borderRadius: 8,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
        }}>
          <div style={{
            flexShrink: 0,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: '#bcc0c4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="17" x2="12" y2="11" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#65676b">
                <path d="M21 10.5V6a1 1 0 0 0-.6-.9l-8-3a1 1 0 0 0-.8 0l-8 3A1 1 0 0 0 3 6v4.5c0 5.5 3.8 10.7 9 12a12.5 12.5 0 0 0 9-12z" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#65676b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Post fixado
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#050505', lineHeight: 1.4 }}>
              {resolvedPinned}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
