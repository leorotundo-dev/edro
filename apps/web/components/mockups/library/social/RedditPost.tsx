'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface RedditPostProps {
  // Identity
  subreddit?: string;
  username?: string;
  name?: string;
  brandName?: string;
  // Content
  title?: string;
  headline?: string;
  body?: string;
  postText?: string;
  caption?: string;
  description?: string;
  text?: string;
  // Media
  postImage?: string;
  image?: string;
  thumbnail?: string;
  // Meta
  timeLabel?: string;
  timeAgo?: string;
  upvoteCount?: number | string;
  upvotes?: number | string;
  commentCount?: number | string;
  comments?: number | string;
  // Flairs / badges
  flair?: string;
  isOC?: boolean;
  isNSFW?: boolean;
  award?: string;
  awards?: number;
}

const REDDIT_ORANGE = '#FF4500';
const REDDIT_BLUE = '#7193FF';
const REDDIT_BG = '#FFFFFF';
const CARD_BORDER = '#CACACD';
const META_COLOR = '#878A8C';
const VOTE_COL_BG = '#F8F9FA';
const FONT = '-apple-system, BlinkMacSystemFont, "IBM Plex Sans", "Segoe UI", sans-serif';

function formatVotes(n: number | string): string {
  if (typeof n === 'string') return n;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const RedditLogo = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill={REDDIT_ORANGE}>
    <circle cx="10" cy="10" r="10" />
    <path
      d="M16.7 10a1.7 1.7 0 0 0-2.9-1.2c-.8-.5-1.9-.9-3.1-.9l.5-2.5 1.7.3a1.2 1.2 0 1 0 1.3-1.2c-.5 0-.9.3-1.1.7l-1.9-.4a.2.2 0 0 0-.2.1L10.4 8c-1.2 0-2.3.4-3.1.9A1.7 1.7 0 0 0 4.4 11c0 .2 0 .4.1.6-.1.2-.1.5-.1.7 0 2.2 2.5 4 5.6 4s5.6-1.8 5.6-4c0-.2 0-.5-.1-.7.1-.2.2-.4.2-.6zM7.5 11c0-.6.5-1.2 1.2-1.2s1.2.5 1.2 1.2-.5 1.2-1.2 1.2-1.2-.5-1.2-1.2zm6.3 3.1c-.7.7-2 1.1-3.8 1.1-1.8 0-3.1-.4-3.8-1.1a.3.3 0 0 1 0-.4.3.3 0 0 1 .4 0c.6.6 1.7.9 3.4.9s2.8-.3 3.4-.9a.3.3 0 0 1 .4 0 .3.3 0 0 1 0 .4zm-.2-1.9c-.7 0-1.2-.5-1.2-1.2s.5-1.2 1.2-1.2 1.2.5 1.2 1.2-.5 1.2-1.2 1.2z"
      fill="white"
    />
  </svg>
);

const AwardBadge = ({ color, label }: { color: string; label: string }) => (
  <div
    title={label}
    style={{
      width: 16,
      height: 16,
      borderRadius: '50%',
      background: color,
      border: '1.5px solid rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    <svg width="8" height="8" viewBox="0 0 10 10" fill="white">
      <path d="M5 1l1.2 2.5L9 4l-2 2 .5 2.8L5 7.5 2.5 8.8 3 6 1 4l2.8-.5L5 1z" />
    </svg>
  </div>
);

export const RedditPost: React.FC<RedditPostProps> = ({
  subreddit = 'r/marketing',
  username,
  name,
  brandName,
  title,
  headline,
  body,
  postText,
  caption,
  description,
  text,
  postImage,
  image,
  thumbnail,
  timeLabel,
  timeAgo,
  upvoteCount,
  upvotes,
  commentCount,
  comments,
  flair,
  isOC = false,
  isNSFW = false,
  award,
  awards = 0,
}) => {
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [saved, setSaved] = useState(false);

  const displayUser = username || name || brandName || 'u/redditor';
  const normalizedUser = displayUser.startsWith('u/') ? displayUser : `u/${displayUser}`;
  const normalizedSub = subreddit.startsWith('r/') ? subreddit : `r/${subreddit}`;
  const displayTitle = title || headline || 'Título da publicação';
  const bodyText = body || postText || caption || description || text || '';
  const displayMedia = postImage || image || thumbnail || '';
  const displayTime = timeLabel || timeAgo || '2h';

  const rawUpvotes = upvoteCount ?? upvotes ?? 1234;
  const rawComments = commentCount ?? comments ?? 89;

  const voteNum = typeof rawUpvotes === 'number'
    ? rawUpvotes + (vote === 'up' ? 1 : vote === 'down' ? -1 : 0)
    : rawUpvotes;

  const voteColor =
    vote === 'up' ? REDDIT_ORANGE
    : vote === 'down' ? REDDIT_BLUE
    : META_COLOR;

  // Total awards to show (from awards prop, max 3 display)
  const totalAwards = typeof awards === 'number' ? awards : 0;

  const actionBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: META_COLOR,
    padding: '6px 8px',
    fontSize: 12,
    fontWeight: 700,
    borderRadius: 2,
    fontFamily: FONT,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        width: 440,
        maxWidth: '100%',
        background: REDDIT_BG,
        border: `1px solid ${CARD_BORDER}`,
        borderRadius: 4,
        fontFamily: FONT,
        color: '#1c1c1c',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex' }}>

        {/* ── Vote column ── */}
        <div
          style={{
            width: 40,
            background: VOTE_COL_BG,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '10px 4px',
            gap: 2,
            flexShrink: 0,
          }}
        >
          {/* Upvote */}
          <button
            type="button"
            aria-label="Curtir"
            onClick={() => setVote(p => p === 'up' ? null : 'up')}
            style={{
              background: vote === 'up' ? `${REDDIT_ORANGE}18` : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: vote === 'up' ? REDDIT_ORANGE : META_COLOR,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={vote === 'up' ? REDDIT_ORANGE : 'none'} stroke={vote === 'up' ? REDDIT_ORANGE : META_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>

          {/* Karma */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: voteColor,
              lineHeight: 1,
              letterSpacing: '-0.3px',
              minHeight: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {formatVotes(voteNum)}
          </span>

          {/* Downvote */}
          <button
            type="button"
            aria-label="Descurtir"
            onClick={() => setVote(p => p === 'down' ? null : 'down')}
            style={{
              background: vote === 'down' ? `${REDDIT_BLUE}18` : 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: vote === 'down' ? REDDIT_BLUE : META_COLOR,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={vote === 'down' ? REDDIT_BLUE : 'none'} stroke={vote === 'down' ? REDDIT_BLUE : META_COLOR} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, padding: '10px 10px 6px', minWidth: 0 }}>

          {/* Post header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {/* Subreddit icon */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
              <RedditLogo />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1c1c', cursor: 'pointer' }}>
              {normalizedSub}
            </span>
            <span style={{ fontSize: 12, color: META_COLOR }}>·</span>
            <span style={{ fontSize: 12, color: META_COLOR }}>Postado por</span>
            <span style={{ fontSize: 12, color: META_COLOR, cursor: 'pointer' }}>
              {normalizedUser}
            </span>
            <span style={{ fontSize: 12, color: META_COLOR }}>{displayTime}</span>

            {/* Awards */}
            {totalAwards > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: 2 }}>
                {totalAwards >= 1 && <AwardBadge color="#FFD700" label="Ouro" />}
                {totalAwards >= 2 && <AwardBadge color="#C0C0C0" label="Prata" />}
                {totalAwards >= 3 && <AwardBadge color="#6A737A" label="Platina" />}
                {award && (
                  <span style={{ fontSize: 10, color: META_COLOR }}>{award}</span>
                )}
              </div>
            )}
          </div>

          {/* Title + flairs */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                color: '#222',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                flex: 1,
              }}
            >
              {displayTitle}
            </h3>

            {/* Flair badges */}
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignSelf: 'center', flexWrap: 'wrap' }}>
              {isNSFW && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#FF585B',
                    border: '1px solid #FF585B',
                    borderRadius: 3,
                    padding: '1px 5px',
                    lineHeight: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  NSFW
                </span>
              )}
              {isOC && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#0DD3BB',
                    border: '1px solid #0DD3BB',
                    borderRadius: 3,
                    padding: '1px 5px',
                    lineHeight: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  OC
                </span>
              )}
              {flair && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#fff',
                    background: '#FF4500',
                    borderRadius: 12,
                    padding: '1px 7px',
                    lineHeight: '16px',
                  }}
                >
                  {flair}
                </span>
              )}
            </div>
          </div>

          {/* Body text */}
          {bodyText ? (
            <p
              style={{
                fontSize: 14,
                color: '#3c3c3c',
                margin: '0 0 10px',
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {bodyText}
            </p>
          ) : null}

          {/* Post image */}
          {displayMedia ? (
            <div
              style={{
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 10,
                border: `1px solid #E5E5E5`,
              }}
            >
              <img
                src={displayMedia}
                alt="Post"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }}
              />
            </div>
          ) : null}

          {/* Action bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 4, flexWrap: 'wrap' }}>
            {/* Comments */}
            <button type="button" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {formatVotes(rawComments)} Comentários
            </button>

            {/* Share */}
            <button type="button" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              Compartilhar
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={() => setSaved(p => !p)}
              style={{ ...actionBtn, color: saved ? REDDIT_ORANGE : META_COLOR }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={saved ? REDDIT_ORANGE : 'none'}
                stroke={saved ? REDDIT_ORANGE : 'currentColor'}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>
              {saved ? 'Salvo' : 'Salvar'}
            </button>

            {/* Award */}
            <button type="button" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              Premiar
            </button>

            {/* Overflow */}
            <button type="button" aria-label="Mais opções" style={actionBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
