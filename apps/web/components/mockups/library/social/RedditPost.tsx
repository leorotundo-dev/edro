import React, { useState } from 'react';

interface RedditPostProps {
  subreddit?: string;
  username?: string;
  name?: string;
  timeAgo?: string;
  title?: string;
  headline?: string;
  postText?: string;
  caption?: string;
  description?: string;
  text?: string;
  postImage?: string;
  image?: string;
  upvotes?: number | string;
  comments?: number | string;
  awards?: number;
}

function formatCount(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const UpArrow = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#FF4500' : 'none'} stroke={active ? '#FF4500' : '#878A8C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

const DownArrow = ({ active }: { active: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill={active ? '#7193FF' : 'none'} stroke={active ? '#7193FF' : '#878A8C'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// Reddit awards: gold/silver/platinum circles
const Award = ({ color, label }: { color: string; label: string }) => (
  <div title={label} style={{ width: 16, height: 16, borderRadius: '50%', background: color, border: '1.5px solid rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
      <path d="M5 1l1.2 2.5L9 4l-2 2 .5 2.8L5 7.5 2.5 8.8 3 6 1 4l2.8-.5L5 1z" />
    </svg>
  </div>
);

export const RedditPost: React.FC<RedditPostProps> = ({
  subreddit = 'r/marketing',
  username,
  name,
  timeAgo = '2h',
  title,
  headline,
  postText,
  caption,
  description,
  text,
  postImage,
  image,
  upvotes = 1234,
  comments = 89,
  awards = 2,
}) => {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const displayUser = username || name || 'u/redditor';
  const normalizedUser = displayUser.startsWith('u/') ? displayUser : `u/${displayUser}`;
  const normalizedSub = subreddit.startsWith('r/') ? subreddit : `r/${subreddit}`;
  const displayTitle = title || headline || 'Título do post';
  const bodyText = postText || caption || description || text || '';
  const media = postImage || image || '';

  const voteCount = typeof upvotes === 'number'
    ? upvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0)
    : upvotes;

  const voteColor = vote === 'up' ? '#FF4500' : vote === 'down' ? '#7193FF' : '#878A8C';

  return (
    <div style={{ width: 700, maxWidth: '100%', background: '#fff', border: '1px solid #ccc', borderRadius: 4, fontFamily: '-apple-system, BlinkMacSystemFont, "IBM Plex Sans", sans-serif', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex' }}>

        {/* Vote column */}
        <div style={{ width: 40, background: '#F8F9FA', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', gap: 2 }}>
          <button type="button" aria-label="Upvote" onClick={() => setVote(p => p === 'up' ? null : 'up')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 2, display: 'flex' }}>
            <UpArrow active={vote === 'up'} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 700, color: voteColor, lineHeight: 1 }}>{formatCount(voteCount)}</span>
          <button type="button" aria-label="Downvote" onClick={() => setVote(p => p === 'down' ? null : 'down')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 2, display: 'flex' }}>
            <DownArrow active={vote === 'down'} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '8px 8px 4px', minWidth: 0 }}>

          {/* Meta row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {/* Subreddit icon */}
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FF4500', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="white">
                <circle cx="10" cy="10" r="9" fill="#FF4500" />
                <path d="M16.7 10a1.7 1.7 0 0 0-2.9-1.2c-.8-.5-1.9-.9-3.1-.9l.5-2.5 1.7.3a1.2 1.2 0 1 0 1.3-1.2c-.5 0-.9.3-1.1.7l-1.9-.4a.2.2 0 0 0-.2.1L10.4 8c-1.2 0-2.3.4-3.1.9A1.7 1.7 0 0 0 4.4 11c0 .2 0 .4.1.6-.1.2-.1.5-.1.7 0 2.2 2.5 4 5.6 4s5.6-1.8 5.6-4c0-.2 0-.5-.1-.7.1-.2.2-.4.2-.6zM7.5 11c0-.6.5-1.2 1.2-1.2s1.2.5 1.2 1.2-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2zm6.3 3.1c-.7.7-2 1.1-3.8 1.1-1.8 0-3.1-.4-3.8-1.1a.3.3 0 0 1 0-.4.3.3 0 0 1 .4 0c.6.6 1.7.9 3.4.9s2.8-.3 3.4-.9a.3.3 0 0 1 .4 0 .3.3 0 0 1 0 .4zm-.2-1.9c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2z" fill="white" />
              </svg>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1c1c' }}>{normalizedSub}</span>
            <span style={{ fontSize: 12, color: '#878A8C' }}>• Postado por</span>
            <span style={{ fontSize: 12, color: '#878A8C' }}>{normalizedUser}</span>
            <span style={{ fontSize: 12, color: '#878A8C' }}>{timeAgo}</span>
            {awards > 0 && (
              <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                {awards >= 1 && <Award color="#C9B037" label="Ouro" />}
                {awards >= 2 && <Award color="#B4B4B4" label="Prata" />}
                {awards >= 3 && <Award color="#6A737A" label="Platina" />}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 style={{ fontSize: 18, fontWeight: 500, color: '#222', margin: '0 0 8px', lineHeight: 1.3 }}>{displayTitle}</h3>

          {/* Body text */}
          {bodyText ? (
            <p style={{ fontSize: 14, color: '#1c1c1c', margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bodyText}</p>
          ) : null}

          {/* Media */}
          {media ? (
            <div style={{ borderRadius: 4, overflow: 'hidden', marginBottom: 8, border: '1px solid #e5e5e5' }}>
              <img src={media} alt="Post" style={{ width: '100%', maxHeight: 400, objectFit: 'cover', display: 'block' }} />
            </div>
          ) : null}

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#878A8C', marginTop: 4 }}>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#878A8C', padding: '6px 8px', borderRadius: 2, fontSize: 12, fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {formatCount(comments)} Comentários
            </button>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#878A8C', padding: '6px 8px', borderRadius: 2, fontSize: 12, fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Compartilhar
            </button>
            <button type="button" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#878A8C', padding: '6px 8px', borderRadius: 2, fontSize: 12, fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              Salvar
            </button>
            <button type="button" aria-label="Mais opções" style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#878A8C', padding: '6px 8px', borderRadius: 2, fontSize: 12, fontWeight: 700 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
