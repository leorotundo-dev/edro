import React, { useState } from 'react';

interface BehanceProjectProps {
  projectImage?: string;
  image?: string;
  postImage?: string;
  projectTitle?: string;
  title?: string;
  headline?: string;
  name?: string;
  creatorName?: string;
  username?: string;
  creatorAvatar?: string;
  profileImage?: string;
  likes?: number | string;
  views?: number | string;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const BehanceProject: React.FC<BehanceProjectProps> = ({
  projectImage,
  image,
  postImage,
  projectTitle,
  title,
  headline,
  name,
  creatorName,
  username,
  creatorAvatar,
  profileImage,
  likes = 234,
  views = 1234,
}) => {
  const [liked, setLiked] = useState(false);
  const displayImage = projectImage || image || postImage || '';
  const displayTitle = projectTitle || title || headline || name || 'Título do Projeto';
  const displayName = creatorName || username || 'Criador';
  const displayAvatar = creatorAvatar || profileImage || '';
  const likesCount = typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes;

  return (
    <div style={{ width: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.12)', overflow: 'hidden', cursor: 'pointer', fontFamily: 'proxima-nova, "Helvetica Neue", Arial, sans-serif' }}>
      <div style={{ width: '100%', aspectRatio: '4/3', background: '#E4E4E4', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1769FF 0%, #0A4FBF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 16l5-5 4 4 3-3 4 4" /></svg>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <h3 style={{ fontWeight: 700, fontSize: 15, color: '#2c2c2c', margin: '0 0 10px', lineHeight: '20px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{displayTitle}</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1769FF', overflow: 'hidden', flexShrink: 0 }}>
              {displayAvatar ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
              )}
            </div>
            <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>{displayName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" aria-label="Apreciar" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, color: liked ? '#1769FF' : '#888' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? '#1769FF' : 'none'} stroke={liked ? '#1769FF' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span style={{ fontSize: 12 }}>{formatCount(likesCount)}</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#888' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <span style={{ fontSize: 12 }}>{formatCount(views)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
