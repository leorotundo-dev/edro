'use client';
import React, { useState } from 'react';

interface ThreadsPostProps {
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
  content?: string;
  postImage?: string;
  thumbnail?: string;
  likes?: number;
  replies?: number;
  reposts?: number;
  timeAgo?: string;
  isVerified?: boolean;
}

export const ThreadsPost: React.FC<ThreadsPostProps> = ({
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
  content,
  postImage,
  thumbnail,
  likes = 842,
  replies = 47,
  reposts = 128,
  timeAgo = '2h',
  isVerified = false,
}) => {
  const [liked, setLiked] = useState(false);
  const [reposted, setReposted] = useState(false);

  const displayName = name || username || brandName || 'usuario';
  const displayHandle = displayName.toLowerCase().replace(/[\s.]+/g, '_');
  const displayImage = profileImage || image || '';
  const displayText = postText || caption || body || headline || text || content || 'Escreva algo interessante no Threads.';
  const displayPostImage = postImage || thumbnail || '';
  const likeCount = liked ? likes + 1 : likes;

  return (
    <div style={{
      width: 390,
      background: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
      color: '#0F0F0F',
    }}>
      <div style={{ display: 'flex', gap: 12, padding: '14px 16px 0' }}>

        {/* Left: avatar + thread line + ghost avatars */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 40 }}>
          {/* Avatar */}
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            overflow: 'hidden', background: '#E8E8E8', flexShrink: 0,
          }}>
            {displayImage
              ? <img src={displayImage} alt={displayHandle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #C8C8C8 0%, #A8A8A8 100%)' }} />
            }
          </div>
          {/* Thread line */}
          <div style={{ width: 2, flex: 1, background: '#D5D5D5', margin: '5px 0 4px', minHeight: 36 }} />
          {/* Ghost reply avatars */}
          <div style={{ position: 'relative', height: 24, width: 36 }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#D0D0D0', border: '2px solid #fff', position: 'absolute', bottom: 0, left: 0 }} />
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#C0C0C0', border: '2px solid #fff', position: 'absolute', bottom: 2, left: 10 }} />
            <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#B8B8B8', border: '2px solid #fff', position: 'absolute', bottom: 5, left: 18 }} />
          </div>
        </div>

        {/* Right: content */}
        <div style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.01em' }}>{displayHandle}</span>
              {isVerified && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7.5" fill="#0095F6" />
                  <polyline points="4.5 8 7 10.5 11.5 5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 14, color: '#A0A0A0' }}>{timeAgo}</span>
              <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', color: '#A0A0A0', lineHeight: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="5" r="1.3" fill="#A0A0A0" />
                  <circle cx="12" cy="12" r="1.3" fill="#A0A0A0" />
                  <circle cx="12" cy="19" r="1.3" fill="#A0A0A0" />
                </svg>
              </button>
            </div>
          </div>

          {/* Text body */}
          <p style={{ fontSize: 15, lineHeight: 1.55, margin: '0 0 10px', whiteSpace: 'pre-wrap', color: '#0F0F0F' }}>
            {displayText}
          </p>

          {/* Post image */}
          {displayPostImage && (
            <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid #EFEFEF' }}>
              <img
                src={displayPostImage}
                alt=""
                style={{ width: '100%', display: 'block', maxHeight: 320, objectFit: 'cover' }}
              />
            </div>
          )}

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
            {/* Like */}
            <button
              type="button"
              aria-label="Curtir"
              onClick={() => setLiked(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0, transition: 'transform 0.1s' }}
            >
              <svg width="23" height="23" viewBox="0 0 24 24"
                fill={liked ? '#FF3040' : 'none'}
                stroke={liked ? '#FF3040' : '#0F0F0F'}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>

            {/* Comment */}
            <button type="button" aria-label="Comentar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>

            {/* Repost */}
            <button
              type="button"
              aria-label="Repostar"
              onClick={() => setReposted(p => !p)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}
            >
              <svg width="23" height="23" viewBox="0 0 24 24"
                fill="none"
                stroke={reposted ? '#00C853' : '#0F0F0F'}
                strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>

            {/* Share */}
            <button type="button" aria-label="Compartilhar" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 0 }}>
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#0F0F0F" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Footer: reply / like summary */}
      <div style={{ padding: '6px 16px 14px', paddingLeft: 68 }}>
        <span style={{ fontSize: 14, color: '#A0A0A0' }}>
          {replies} respostas · {likeCount} curtidas
        </span>
      </div>

      {/* Bottom separator */}
      <div style={{ height: 1, background: '#F0F0F0', margin: '0 16px' }} />
    </div>
  );
};
