'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface SpotifyPodcastProps {
  // Cover
  coverImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Episode
  episodeTitle?: string;
  title?: string;
  headline?: string;
  // Podcast
  podcastName?: string;
  name?: string;
  brandName?: string;
  // Description
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  // Meta
  duration?: string;
  releaseDate?: string;
  timeLabel?: string;
  isNew?: boolean;
  playCount?: number | string;
}

const SPOTIFY_GREEN = '#1DB954';
const CARD_BG = '#282828';
const DARK_BG = '#121212';
const LIGHT_TEXT = '#FFFFFF';
const GRAY_TEXT = '#B3B3B3';
const DARK_GRAY = '#A7A7A7';
const ICON_COLOR = '#B3B3B3';

export const SpotifyPodcast: React.FC<SpotifyPodcastProps> = ({
  coverImage,
  image,
  postImage,
  thumbnail,
  episodeTitle,
  title,
  headline,
  podcastName,
  name,
  brandName,
  description,
  text,
  body,
  caption,
  duration = '42 min',
  releaseDate,
  timeLabel,
  isNew = false,
  playCount,
}) => {
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [progress] = useState(37); // percentage

  const displayCover = coverImage || image || postImage || thumbnail || '';
  const displayEpisodeTitle = episodeTitle || title || headline || 'Título do Episódio';
  const displayPodcastName = podcastName || name || brandName || 'Nome do Podcast';
  const displayDesc = description || text || body || caption || 'Descrição do episódio. Uma conversa aprofundada sobre os temas mais relevantes do mercado hoje.';
  const displayDate = releaseDate || timeLabel || '3 mar. 2026';
  const displayPlays = playCount !== undefined
    ? (typeof playCount === 'number' ? playCount.toLocaleString('pt-BR') : playCount)
    : null;

  const fontFamily = '"Circular", "Helvetica Neue", Helvetica, Arial, sans-serif';

  return (
    <div
      style={{
        width: 300,
        maxWidth: '100%',
        background: CARD_BG,
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily,
        boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
        color: LIGHT_TEXT,
      }}
    >
      {/* ── Top: cover + episode info ── */}
      <div style={{ display: 'flex', gap: 14, padding: '16px 16px 12px', alignItems: 'flex-start' }}>
        {/* Cover art */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
            background: DARK_BG,
            position: 'relative',
          }}
        >
          {displayCover ? (
            <img src={displayCover} alt={displayPodcastName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #2D2D2D 0%, #1A1A1A 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke={GRAY_TEXT} strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            </div>
          )}

          {/* "Novo episódio" badge */}
          {isNew && (
            <div
              style={{
                position: 'absolute',
                top: 6,
                left: 6,
                background: SPOTIFY_GREEN,
                color: '#000',
                fontSize: 9,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 10,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Novo
            </div>
          )}
        </div>

        {/* Episode meta */}
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          {/* Podcast name */}
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              color: GRAY_TEXT,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              fontWeight: 600,
            }}
          >
            {displayPodcastName}
          </p>

          {/* Episode title */}
          <h3
            style={{
              margin: '0 0 8px',
              fontSize: 15,
              fontWeight: 700,
              color: LIGHT_TEXT,
              lineHeight: 1.3,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {displayEpisodeTitle}
          </h3>

          {/* Duration + date */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: DARK_GRAY }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{duration}</span>
            <span>·</span>
            <span>{displayDate}</span>
          </div>

          {/* Play count */}
          {displayPlays && (
            <p style={{ margin: '4px 0 0', fontSize: 10, color: DARK_GRAY }}>
              {displayPlays} reproduções
            </p>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      <div style={{ padding: '0 16px 10px' }}>
        <div
          style={{
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: SPOTIFY_GREEN,
              borderRadius: 2,
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 9, color: DARK_GRAY }}>
            {Math.round((progress / 100) * parseInt(duration))} min
          </span>
          <span style={{ fontSize: 9, color: DARK_GRAY }}>{duration}</span>
        </div>
      </div>

      {/* ── Episode description ── */}
      <div style={{ padding: '0 16px 14px' }}>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: GRAY_TEXT,
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {displayDesc}
        </p>
      </div>

      {/* ── Action row ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Play button — green pill */}
        <button
          type="button"
          onClick={() => setPlaying(p => !p)}
          aria-label={playing ? 'Pausar' : 'Reproduzir'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: SPOTIFY_GREEN,
            border: 'none',
            borderRadius: 20,
            padding: '8px 18px',
            cursor: 'pointer',
            color: '#000',
            fontWeight: 700,
            fontSize: 13,
            fontFamily,
            flexShrink: 0,
          }}
        >
          {playing ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
          {playing ? 'Pausar' : 'Reproduzir'}
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Download icon */}
        <button
          type="button"
          onClick={() => setDownloaded(p => !p)}
          aria-label="Baixar episódio"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: downloaded ? SPOTIFY_GREEN : ICON_COLOR,
            borderRadius: '50%',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>

        {/* + Add icon */}
        <button
          type="button"
          onClick={() => setSaved(p => !p)}
          aria-label="Adicionar à biblioteca"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: saved ? SPOTIFY_GREEN : ICON_COLOR,
            borderRadius: '50%',
          }}
        >
          {saved ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={SPOTIFY_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          )}
        </button>

        {/* Overflow */}
        <button
          type="button"
          aria-label="Mais opções"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ICON_COLOR,
            borderRadius: '50%',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>
    </div>
  );
};
