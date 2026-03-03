'use client';
import React, { useState } from 'react';

interface BlueSkyProps {
  username?: string;
  name?: string;
  brandName?: string;
  profileImage?: string;
  image?: string;
  postText?: string;
  caption?: string;
  body?: string;
  headline?: string;
  text?: string;
  postImage?: string;
  thumbnail?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  quotes?: number;
  timeAgo?: string;
  isVerified?: boolean;
  handle?: string;
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Bluesky butterfly logo
const BlueSkyButterfly = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 360 320" fill="#0085ff">
    <path d="M180 142c-16-68-71-109-126-109C27 33 0 71 0 107c0 34 16 64 44 64 16 0 30-7 40-20-4 26-18 60-42 96h276c-24-36-38-70-42-96 10 13 24 20 40 20 28 0 44-30 44-64 0-36-27-74-54-74-55 0-110 41-126 109z" />
  </svg>
);

export const BlueSky: React.FC<BlueSkyProps> = ({
  username,
  name,
  brandName,
  profileImage,
  image,
  postText,
  caption,
  body,
  headline,
  text,
  postImage,
  thumbnail,
  likes = 284,
  reposts = 91,
  replies = 47,
  quotes = 12,
  timeAgo = '2h',
  isVerified = false,
  handle,
}) => {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  const displayName = name || username || brandName || 'Usuário Bluesky';
  const rawHandle = handle || username || name || brandName || 'usuario';
  const displayHandle = rawHandle.toLowerCase().replace(/\s+/g, '') + '.bsky.social';
  const displayAvatar = profileImage || image || '';
  const displayText = postText || caption || body || headline || text || 'Olá, Bluesky! 👋 Que ótimo ter mais uma rede aberta e descentralizada.';
  const displayPostImage = postImage || thumbnail || '';

  const likeCount = liked ? likes + 1 : likes;
  const repostCount = reposted ? reposts + 1 : reposts;

  return (
    <div style={{
      width: 600,
      background: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#0F1419',
      border: '1px solid #E1E8ED',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
        borderBottom: '1px solid #EFF3F4',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BlueSkyButterfly size={20} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0085ff' }}>Bluesky</span>
        </div>
        <span style={{ fontSize: 12, color: '#8899A6' }}>bsky.app</span>
      </div>

      {/* Post content */}
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px' }}>
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            overflow: 'hidden', background: '#E1E8ED',
          }}>
            {displayAvatar
              ? <img src={displayAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0085ff 0%, #00c6ff 100%)' }} />
            }
          </div>
        </div>

        {/* Right column */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Author + time */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{displayName}</span>
                {isVerified && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7.5" fill="#0085ff" />
                    <polyline points="4.5 8 7 10.5 11.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 14, color: '#657786', marginTop: 1 }}>@{displayHandle}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#8899A6' }}>{timeAgo}</span>
              <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0, color: '#8899A6' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.3" fill="#8899A6" />
                  <circle cx="12" cy="12" r="1.3" fill="#8899A6" />
                  <circle cx="12" cy="19" r="1.3" fill="#8899A6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Post text */}
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 12px', whiteSpace: 'pre-wrap', color: '#0F1419' }}>
            {displayText}
          </p>

          {/* Post image */}
          {displayPostImage && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: '1px solid #E1E8ED' }}>
              <img src={displayPostImage} alt="" style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }} />
            </div>
          )}

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 24, marginTop: 4 }}>
            {/* Reply */}
            <button type="button" aria-label="Responder" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 5, color: '#657786',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#657786" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span style={{ fontSize: 14 }}>{fmtCount(replies)}</span>
            </button>

            {/* Repost */}
            <button
              type="button"
              aria-label="Repostar"
              onClick={() => setReposted(p => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                color: reposted ? '#00C853' : '#657786',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={reposted ? '#00C853' : '#657786'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              <span style={{ fontSize: 14 }}>{fmtCount(repostCount)}</span>
            </button>

            {/* Like */}
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked(p => !p)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 5,
                color: liked ? '#E0245E' : '#657786',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24"
                fill={liked ? '#E0245E' : 'none'}
                stroke={liked ? '#E0245E' : '#657786'}
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span style={{ fontSize: 14 }}>{fmtCount(likeCount)}</span>
            </button>

            {/* Quote */}
            <button type="button" aria-label="Citar" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 5, color: '#657786',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#657786" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
              <span style={{ fontSize: 14 }}>{fmtCount(quotes)}</span>
            </button>

            {/* Share */}
            <button type="button" aria-label="Compartilhar" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 5, color: '#657786', marginLeft: 'auto',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#657786" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
