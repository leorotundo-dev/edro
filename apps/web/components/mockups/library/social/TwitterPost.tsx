import React, { useState } from 'react';

interface TwitterPostProps {
  username?: string;
  handle?: string;
  profileImage?: string;
  tweetText?: string;
  caption?: string;
  postText?: string;
  description?: string;
  text?: string;
  tweetImage?: string;
  image?: string;
  postImage?: string;
  replies?: number | string;
  retweets?: number | string;
  likes?: number | string;
  timeAgo?: string;
  /** 'blue' | 'gold' | null */
  verified?: 'blue' | 'gold' | null;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const BlueCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-label="Conta verificada">
    <path fill="#1D9BF0" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
  </svg>
);

const GoldCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-label="Conta verificada (Gold)">
    <path fill="#FFD400" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.8c.67 1.31 1.91 2.2 3.34 2.2s2.68-.89 3.34-2.2c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z" />
  </svg>
);

// X thin-line icons (authentic X/Twitter style)
const ReplyIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const RepostIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 23l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const LikeIcon = ({ filled }: { filled: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? '#F91880' : 'none'} stroke={filled ? '#F91880' : 'currentColor'} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78v0z" />
  </svg>
);

const BookmarkIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const ShareIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

function renderTweetText(text: string) {
  return text.split(/((?:#|@|https?:\/\/)\S+)/g).map((part, i) => {
    if (part.startsWith('#') || part.startsWith('@') || part.startsWith('http')) {
      return <span key={i} style={{ color: '#1D9BF0' }}>{part}</span>;
    }
    return <span key={i}>{part}</span>;
  });
}

export const TwitterPost: React.FC<TwitterPostProps> = ({
  username = 'Username',
  handle = '@username',
  profileImage = '',
  tweetText,
  caption,
  postText,
  description,
  text,
  tweetImage,
  image,
  postImage,
  replies = 12,
  retweets = 34,
  likes = 156,
  timeAgo = '2h',
  verified = 'blue',
}) => {
  const [liked, setLiked] = useState(false);
  const displayText = tweetText || caption || postText || description || text || '';
  const media = tweetImage || image || postImage || '';
  const normalizedHandle = handle.startsWith('@') ? handle : `@${handle}`;

  const repliesLabel = formatCount(replies);
  const retweetsLabel = formatCount(retweets);
  const likesLabel = formatCount(liked ? (typeof likes === 'number' ? likes + 1 : likes) : likes);

  return (
    <div
      style={{
        width: 598,
        maxWidth: '100%',
        background: '#ffffff',
        borderBottom: '1px solid #EFF3F4',
        padding: '12px 16px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        color: '#0F1419',
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#CFD9DE',
          flexShrink: 0,
        }}>
          {profileImage ? (
            <img src={profileImage} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1D9BF0 0%, #0f6dad 100%)' }} />
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15, lineHeight: '20px' }}>{username}</span>
              {verified === 'blue' && <BlueCheck />}
              {verified === 'gold' && <GoldCheck />}
              <span style={{ color: '#536471', fontSize: 15 }}>{normalizedHandle}</span>
              <span style={{ color: '#536471' }}>·</span>
              <span style={{ color: '#536471', fontSize: 15 }}>{timeAgo}</span>
            </div>
            <button
              type="button"
              aria-label="Mais opções"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#536471', padding: 4, flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>

          {/* Tweet text */}
          {displayText ? (
            <p style={{ fontSize: 15, lineHeight: '20px', margin: '0 0 10px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {renderTweetText(displayText)}
            </p>
          ) : null}

          {/* Media */}
          {media ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #CFD9DE', marginBottom: 10 }}>
              <img src={media} alt="Tweet" style={{ width: '100%', height: 'auto', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
            </div>
          ) : null}

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 425, marginTop: 6 }}>
            <button type="button" aria-label="Responder" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#536471', padding: 0, fontSize: 13 }}>
              <ReplyIcon /><span>{repliesLabel}</span>
            </button>
            <button type="button" aria-label="Repostar" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#536471', padding: 0, fontSize: 13 }}>
              <RepostIcon /><span>{retweetsLabel}</span>
            </button>
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked((p) => !p)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: liked ? '#F91880' : '#536471', padding: 0, fontSize: 13 }}
            >
              <LikeIcon filled={liked} /><span>{likesLabel}</span>
            </button>
            <button type="button" aria-label="Salvar" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#536471', padding: 0, fontSize: 13 }}>
              <BookmarkIcon />
            </button>
            <button type="button" aria-label="Compartilhar" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#536471', padding: 0, fontSize: 13 }}>
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
