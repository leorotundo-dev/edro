'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface LinkedInPostProps {
  // Identity
  name?: string;
  username?: string;
  brandName?: string;
  authorHeadline?: string;
  headline?: string;
  subheadline?: string;
  subtitle?: string;
  profileImage?: string;
  thumbnail?: string;
  // Content
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  postText?: string;
  // Media
  postImage?: string;
  image?: string;
  // Metrics
  likeCount?: number | string;
  likes?: number | string;
  commentCount?: number | string;
  comments?: number | string;
  repostCount?: number | string;
  shares?: number | string;
  // Meta
  timeLabel?: string;
  timeAgo?: string;
  connectionDegree?: string;
  showFollow?: boolean;
}

const LI_BLUE = '#0A66C2';
const LI_GRAY = '#666666';
const LI_BG = '#F3F2EF';
const LI_TEXT = 'rgba(0,0,0,0.9)';
const LI_TEXT_MUTED = 'rgba(0,0,0,0.60)';
const LI_BORDER = '#E0DFDC';

export const LinkedInPost: React.FC<LinkedInPostProps> = ({
  name,
  username,
  brandName,
  authorHeadline,
  headline,
  subheadline,
  subtitle,
  profileImage,
  thumbnail,
  body,
  caption,
  description,
  text,
  postText,
  postImage,
  image,
  likeCount,
  likes,
  commentCount,
  comments,
  repostCount,
  shares,
  timeLabel,
  timeAgo,
  connectionDegree = '1º',
  showFollow = true,
}) => {
  const [liked, setLiked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const displayName = name || username || brandName || 'Nome Profissional';
  const displayHeadline = authorHeadline || headline || subheadline || subtitle || 'Cargo · Empresa';
  const displayTime = timeLabel || timeAgo || '2 h';
  const displayImage = profileImage || thumbnail || '';
  const displayPost = postImage || image || '';
  const postBody = body || postText || caption || description || text || '';

  const rawLikes = likeCount ?? likes ?? 1234;
  const rawComments = commentCount ?? comments ?? 124;
  const rawReposts = repostCount ?? shares ?? 45;

  const likesNum = typeof rawLikes === 'number' ? rawLikes + (liked ? 1 : 0) : rawLikes;
  const likesLabel = typeof likesNum === 'number' ? likesNum.toLocaleString('pt-BR') : String(likesNum);
  const commentsLabel = typeof rawComments === 'number' ? rawComments.toLocaleString('pt-BR') : String(rawComments);
  const repostsLabel = typeof rawReposts === 'number' ? rawReposts.toLocaleString('pt-BR') : String(rawReposts);

  const fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  const actionBtnStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: LI_TEXT_MUTED,
    padding: '10px 4px',
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 4,
    fontFamily,
  };

  return (
    <div
      style={{
        width: 420,
        maxWidth: '100%',
        background: '#FFFFFF',
        borderRadius: 8,
        border: `1px solid ${LI_BORDER}`,
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        fontFamily,
        color: LI_TEXT,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px 8px' }}>
        {/* Avatar */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${LI_BLUE}`,
            flexShrink: 0,
            background: '#D0E8FF',
          }}
        >
          {displayImage ? (
            <img src={displayImage} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: `linear-gradient(135deg, ${LI_BLUE} 0%, #004182 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5.33 0-8 2.67-8 4v1h16v-1c0-1.33-2.67-4-8-4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Name + headline + time */}
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: LI_TEXT, cursor: 'pointer' }}>{displayName}</span>
            <span style={{ fontSize: 13, color: LI_GRAY }}>{connectionDegree}</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: LI_TEXT_MUTED,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 1,
            }}
          >
            {displayHeadline}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 12, color: LI_TEXT_MUTED }}>
            <span>{displayTime}</span>
            <span>·</span>
            {/* Globe icon */}
            <svg width="12" height="12" viewBox="0 0 16 16" fill={LI_TEXT_MUTED}>
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zM2.5 8.5h2c.1 1 .3 2 .7 2.8A5.5 5.5 0 0 1 2.5 8.5zm2 -1h-2A5.5 5.5 0 0 1 5.2 4.7c-.4.8-.6 1.8-.7 2.8zm1 0c.1-1.2.5-2.2 1-2.9.4-.5.7-.6 1-.6s.6.1 1 .6c.5.7.9 1.7 1 2.9H5.5zm0 1h4c-.1 1.2-.5 2.2-1 2.9-.4.5-.7.6-1 .6s-.6-.1-1-.6c-.5-.7-.9-1.7-1-2.9zm5 0h2A5.5 5.5 0 0 1 10.8 11.3c.4-.8.6-1.8.7-2.8zm0-1c-.1-1-.3-2-.7-2.8A5.5 5.5 0 0 1 13.5 7.5h-2z" />
            </svg>
          </div>
        </div>

        {/* Right side: Follow + overflow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {showFollow && (
            <button
              type="button"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: LI_BLUE,
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 4px',
                fontFamily,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill={LI_BLUE}>
                <path d="M9 7H7v2H5v2h2v2h2v-2h2V9H9V7zm4.5-5.5h-11A1.5 1.5 0 0 0 1 3v10a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 15 13V3a1.5 1.5 0 0 0-1.5-1.5zm0 12h-11V3h11v10.5z" />
              </svg>
              Seguir
            </button>
          )}
          <button
            type="button"
            aria-label="Mais opções"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: LI_TEXT_MUTED, padding: 4, display: 'flex' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Post body text ── */}
      {postBody ? (
        <div style={{ padding: '0 16px 10px', fontSize: 14, lineHeight: 1.5, color: LI_TEXT }}>
          <p
            style={{
              margin: 0,
              display: '-webkit-box',
              WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: 'vertical',
              overflow: expanded ? 'visible' : 'hidden',
            }}
          >
            {postBody}
          </p>
          {!expanded && postBody.length > 180 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: LI_TEXT_MUTED,
                fontWeight: 600,
                fontSize: 14,
                padding: '2px 0 0',
                fontFamily,
              }}
            >
              …ver mais
            </button>
          )}
        </div>
      ) : null}

      {/* ── Post image ── */}
      {displayPost ? (
        <div style={{ width: '100%', overflow: 'hidden' }}>
          <img
            src={displayPost}
            alt="Publicação"
            style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover', borderRadius: 4 }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            aspectRatio: '16/9',
            background: LI_BG,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: LI_TEXT_MUTED }}>Mídia do post</span>
        </div>
      )}

      {/* ── Reaction summary ── */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 12,
          color: LI_TEXT_MUTED,
          borderBottom: `1px solid ${LI_BORDER}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
          {/* Reaction emoji badges */}
          <div style={{ display: 'flex', marginRight: 2 }}>
            {/* Like */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: LI_BLUE,
                border: '1.5px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -2,
              }}
            >
              <span style={{ fontSize: 10 }}>👍</span>
            </div>
            {/* Heart */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#DF704D',
                border: '1.5px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -4,
              }}
            >
              <span style={{ fontSize: 10 }}>❤️</span>
            </div>
            {/* Celebrate */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#6DAE4F',
                border: '1.5px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: -4,
              }}
            >
              <span style={{ fontSize: 10 }}>🤝</span>
            </div>
          </div>
          <span>{likesLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span style={{ cursor: 'pointer' }}>{commentsLabel} comentários</span>
          <span>·</span>
          <span style={{ cursor: 'pointer' }}>{repostsLabel} repostagens</span>
        </div>
      </div>

      {/* ── Action buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px' }}>
        {/* Curtir */}
        <button
          type="button"
          onClick={() => setLiked(p => !p)}
          style={{
            ...actionBtnStyle,
            color: liked ? LI_BLUE : LI_TEXT_MUTED,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? LI_BLUE : 'none'} stroke={liked ? LI_BLUE : 'currentColor'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z" />
            <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          Curtir
        </button>

        {/* Comentar */}
        <button type="button" style={actionBtnStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Comentar
        </button>

        {/* Repostar */}
        <button type="button" style={actionBtnStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          Repostar
        </button>

        {/* Enviar */}
        <button type="button" style={actionBtnStyle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          Enviar
        </button>
      </div>
    </div>
  );
};
