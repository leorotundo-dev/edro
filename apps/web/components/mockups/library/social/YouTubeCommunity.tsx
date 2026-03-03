import React, { useState } from 'react';

interface YouTubeCommunityProps {
  channelName?: string;
  name?: string;
  username?: string;
  channelImage?: string;
  profileImage?: string;
  postText?: string;
  text?: string;
  caption?: string;
  description?: string;
  body?: string;
  postImage?: string;
  image?: string;
  likes?: number | string;
  comments?: number | string;
  timeAgo?: string;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}mil`;
  return String(n);
}

export const YouTubeCommunity: React.FC<YouTubeCommunityProps> = ({
  channelName,
  name,
  username,
  channelImage,
  profileImage,
  postText,
  text,
  caption,
  description,
  body,
  postImage,
  image,
  likes = 2400,
  comments = 156,
  timeAgo = '1 dia atrás',
}) => {
  const [liked, setLiked] = useState(false);
  const displayName = channelName || name || username || 'Canal';
  const displayAvatar = channelImage || profileImage || '';
  const displayText = postText || text || caption || description || body || 'Texto da publicação da comunidade.';
  const displayImage = postImage || image || '';
  const likesCount = typeof likes === 'number' ? likes + (liked ? 1 : 0) : likes;

  return (
    <div style={{ width: 700, maxWidth: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.1)', border: '1px solid #E5E5E5', padding: '16px', fontFamily: '"Roboto", Arial, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Avatar */}
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#FF0000', overflow: 'hidden', flexShrink: 0 }}>
          {displayAvatar ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#0F0F0F' }}>{displayName}</span>
            <span style={{ fontSize: 13, color: '#606060' }}>{timeAgo}</span>
          </div>
          <p style={{ fontSize: 14, color: '#0F0F0F', margin: '0 0 10px', lineHeight: '20px' }}>{displayText}</p>
          {displayImage && (
            <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <img src={displayImage} alt="Post" style={{ width: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {/* Like */}
            <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: liked ? '#F2F2F2' : 'none', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: liked ? '#0F0F0F' : '#606060' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? '#0F0F0F' : 'none'} stroke={liked ? '#0F0F0F' : '#606060'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span style={{ fontSize: 13 }}>{formatCount(likesCount)}</span>
            </button>
            {/* Dislike */}
            <button type="button" aria-label="Não curtir" style={{ background: 'none', border: 'none', borderRadius: 20, padding: '6px 10px', cursor: 'pointer', color: '#606060' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
                <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
              </svg>
            </button>
            {/* Comments */}
            <button type="button" style={{ background: 'none', border: 'none', borderRadius: 20, padding: '6px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#606060' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#606060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              <span style={{ fontSize: 13 }}>{formatCount(comments)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
