import React, { useState } from 'react';

interface YouTubeShortsProps {
  thumbnail?: string;
  image?: string;
  storyImage?: string;
  title?: string;
  headline?: string;
  caption?: string;
  description?: string;
  text?: string;
  channelName?: string;
  name?: string;
  username?: string;
  channelImage?: string;
  profileImage?: string;
  likes?: string | number;
  comments?: string | number;
  views?: string | number;
  soundName?: string;
}

function formatCount(n: string | number): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const YTThumbUp = ({ filled = false }: { filled?: boolean }) => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill={filled ? '#fff' : 'none'} stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const YTThumbDown = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
    <path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

const YTComment = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const YTShare = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

const YTRemix = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

// YouTube Shorts logo — the sideways "S" wordmark shape
const ShortsLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <path d="M10 2C5.6 2 2 5.6 2 10s3.6 8 8 8a7.97 7.97 0 0 0 5.66-2.34L14.24 14.24A5.95 5.95 0 0 1 10 16c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.16.67 4.24 1.76l-3 3H18V2l-2.34 2.34A7.97 7.97 0 0 0 10 2z" fill="white" />
    </svg>
    <span style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px' }}>Shorts</span>
  </div>
);

export const YouTubeShorts: React.FC<YouTubeShortsProps> = ({
  thumbnail,
  image,
  storyImage,
  title,
  headline,
  caption,
  description,
  text,
  channelName,
  name,
  username,
  channelImage,
  profileImage,
  likes = '24,5K',
  comments = '1,2K',
  soundName,
}) => {
  const [liked, setLiked] = useState(false);
  const media = thumbnail || storyImage || image || '';
  const displayTitle = title || headline || caption || description || text || '';
  const displayChannel = channelName || name || username || '@canal';
  const displayImage = channelImage || profileImage || '';
  const normalizedChannel = displayChannel.startsWith('@') ? displayChannel : `@${displayChannel}`;
  const sound = soundName || `Som original · ${normalizedChannel}`;
  const likesLabel = formatCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);

  return (
    <div style={{ position: 'relative', width: 320, height: 568, background: '#000', borderRadius: 16, overflow: 'hidden', fontFamily: '"Roboto", -apple-system, sans-serif', color: '#fff', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

      {/* Background */}
      {media ? (
        <img src={media} alt="Short" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)' }} />
      )}

      {/* Bottom gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 45%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '14px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 100%)' }}>
        <ShortsLogo />
        {/* Camera / record */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>

      {/* Right action panel */}
      <div style={{ position: 'absolute', right: 8, bottom: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, zIndex: 10 }}>
        {/* Channel avatar + subscribe */}
        <div style={{ position: 'relative', marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', border: '2px solid white', background: '#333' }}>
            {displayImage ? (
              <img src={displayImage} alt={normalizedChannel} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)' }} />
            )}
          </div>
          {/* Subscribe +  */}
          <div style={{ position: 'absolute', bottom: -8, left: '50%', transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#FF0000', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="5" y1="1" x2="5" y2="9" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="5" x2="9" y2="5" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Like */}
        <button type="button" aria-label="Curtir" onClick={() => setLiked(p => !p)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)' }}>
          <YTThumbUp filled={liked} />
          <span style={{ fontSize: 11, fontWeight: 600 }}>{likesLabel}</span>
        </button>

        {/* Dislike */}
        <button type="button" aria-label="Não curti" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)' }}>
          <YTThumbDown />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Não curti</span>
        </button>

        {/* Comments */}
        <button type="button" aria-label="Comentários" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)' }}>
          <YTComment />
          <span style={{ fontSize: 11, fontWeight: 600 }}>{formatCount(comments)}</span>
        </button>

        {/* Share */}
        <button type="button" aria-label="Compartilhar" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)' }}>
          <YTShare />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Compartilhar</span>
        </button>

        {/* Remix */}
        <button type="button" aria-label="Remixar" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', borderRadius: 40, padding: '10px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, backdropFilter: 'blur(4px)' }}>
          <YTRemix />
          <span style={{ fontSize: 11, fontWeight: 600 }}>Remixar</span>
        </button>
      </div>

      {/* Bottom-left info */}
      <div style={{ position: 'absolute', left: 12, right: 68, bottom: 16, zIndex: 10 }}>
        <span style={{ fontWeight: 700, fontSize: 14, display: 'block', marginBottom: 4, textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{normalizedChannel}</span>
        {displayTitle ? (
          <p style={{ fontSize: 13, lineHeight: 1.4, margin: '0 0 8px', textShadow: '0 1px 3px rgba(0,0,0,0.6)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{displayTitle}</p>
        ) : null}
        {/* Sound bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.88)' }}>{sound}</span>
        </div>
      </div>

      {/* Bottom nav strip */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 0 }} />
    </div>
  );
};
