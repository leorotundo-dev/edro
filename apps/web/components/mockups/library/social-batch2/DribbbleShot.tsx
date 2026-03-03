import React, { useState } from 'react';

interface DribbbleShotProps {
  shotImage?: string;
  image?: string;
  postImage?: string;
  title?: string;
  headline?: string;
  caption?: string;
  description?: string;
  designerName?: string;
  name?: string;
  username?: string;
  designerAvatar?: string;
  profileImage?: string;
  likes?: number | string;
  views?: number | string;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export const DribbbleShot: React.FC<DribbbleShotProps> = ({
  shotImage,
  image,
  postImage,
  title,
  headline,
  caption,
  description,
  designerName,
  name,
  username,
  designerAvatar,
  profileImage,
  likes = 123,
  views = 1234,
}) => {
  const [liked, setLiked] = useState(false);
  const displayImage = shotImage || image || postImage || '';
  const displayTitle = title || headline || caption || description || 'Título do Shot';
  const displayName = designerName || name || username || 'Designer';
  const displayAvatar = designerAvatar || profileImage || '';
  const likesCount = typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes;

  return (
    <div style={{ width: 400, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.1)', overflow: 'hidden', cursor: 'pointer', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: '100%', aspectRatio: '4/3', background: '#F3F3F4', overflow: 'hidden' }}>
        {displayImage ? (
          <img src={displayImage} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #EA4C89 0%, #c2185b 100%)' }} />
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#EA4C89', overflow: 'hidden', flexShrink: 0 }}>
              {displayAvatar ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                </div>
              )}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#444D56' }}>{displayName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, color: liked ? '#EA4C89' : '#9E9EA7' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill={liked ? '#EA4C89' : 'none'} stroke={liked ? '#EA4C89' : '#9E9EA7'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span style={{ fontSize: 12 }}>{formatCount(likesCount)}</span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9E9EA7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <span style={{ fontSize: 12, color: '#9E9EA7' }}>{formatCount(views)}</span>
            </div>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#6B6B76', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayTitle}</p>
      </div>
    </div>
  );
};
