import React, { useState } from 'react';

interface ThreadsPostProps {
  username?: string;
  name?: string;
  profileImage?: string;
  postText?: string;
  caption?: string;
  description?: string;
  text?: string;
  postImage?: string;
  image?: string;
  timeAgo?: string;
  likes?: number | string;
  replies?: number | string;
  verified?: boolean;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const THHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? '#FF3040' : 'none'} stroke={filled ? '#FF3040' : '#1A1A1A'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);

const THComment = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const THRepost = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const THShare = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#1A1A1A" />
    <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ThreadsPost: React.FC<ThreadsPostProps> = ({
  username = 'username',
  name,
  profileImage = '',
  postText,
  caption,
  description,
  text,
  postImage,
  image,
  timeAgo = '2h',
  likes = 234,
  replies = 12,
  verified = false,
}) => {
  const [liked, setLiked] = useState(false);
  const displayUsername = name || username;
  const displayText = postText || caption || description || text || '';
  const media = postImage || image || '';
  const likesCount = liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes;

  return (
    <div style={{ width: 598, maxWidth: '100%', background: '#fff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1A1A1A', borderBottom: '1px solid #EFEFEF', padding: '12px 16px 4px' }}>
      <div style={{ display: 'flex', gap: 12 }}>

        {/* Left col: avatar + thread line */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#E5E5E5', border: '1px solid rgba(0,0,0,0.06)' }}>
            {profileImage ? (
              <img src={profileImage} alt={displayUsername} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} />
            )}
          </div>
          {/* Thread line */}
          <div style={{ width: 2, flex: 1, minHeight: 24, background: '#DBDBDB', borderRadius: 1, marginTop: 6 }} />
        </div>

        {/* Right col: content */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 12 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>{displayUsername}</span>
              {verified && <VerifiedBadge />}
              <span style={{ color: '#999', fontSize: 15 }}>{timeAgo}</span>
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#999">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </div>

          {/* Text */}
          {displayText ? (
            <p style={{ fontSize: 15, lineHeight: '20px', margin: '0 0 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{displayText}</p>
          ) : null}

          {/* Media */}
          {media ? (
            <div style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 10, border: '1px solid #F0F0F0' }}>
              <img src={media} alt="Post" style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
            </div>
          ) : null}

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
            <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center' }}>
              <THHeart filled={liked} />
            </button>
            <button type="button" aria-label="Responder" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center' }}>
              <THComment />
            </button>
            <button type="button" aria-label="Repostar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center' }}>
              <THRepost />
            </button>
            <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center' }}>
              <THShare />
            </button>
          </div>
        </div>
      </div>

      {/* Footer: mini avatars + counts */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginTop: 2, paddingBottom: 10 }}>
        <div style={{ display: 'flex' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: `hsl(${i * 80 + 200}, 55%, 62%)`, border: '1.5px solid white', marginLeft: i > 0 ? -5 : 0, zIndex: 3 - i }} />
          ))}
        </div>
        <span style={{ fontSize: 13, color: '#999' }}>
          {formatCount(replies)} respostas · {formatCount(likesCount)} curtidas
        </span>
      </div>
    </div>
  );
};
