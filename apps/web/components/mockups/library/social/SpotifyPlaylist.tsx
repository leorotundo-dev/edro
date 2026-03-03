'use client';

/* eslint-disable react/forbid-dom-props */
import React, { useState } from 'react';

interface SpotifyPlaylistProps {
  // Cover
  coverImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  // Playlist identity
  playlistName?: string;
  name?: string;
  headline?: string;
  title?: string;
  // Creator
  creatorName?: string;
  brandName?: string;
  username?: string;
  // Description
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  // Tracks data
  trackCount?: number | string;
  tracks?: number | string;
  duration?: string;
  // Track 1
  track1Title?: string;
  track1Artist?: string;
  track1Image?: string;
  track1Duration?: string;
  // Track 2
  track2Title?: string;
  track2Artist?: string;
  track2Image?: string;
  track2Duration?: string;
  // Track 3
  track3Title?: string;
  track3Artist?: string;
  track3Image?: string;
  track3Duration?: string;
  // Theme
  darkMode?: boolean;
}

const SPOTIFY_GREEN = '#1DB954';
const DARK_BG = '#121212';
const CARD_BG = '#282828';
const HOVER_BG = '#3E3E3E';
const LIGHT_TEXT = '#FFFFFF';
const GRAY_TEXT = '#B3B3B3';
const DARK_GRAY = '#A7A7A7';

export const SpotifyPlaylist: React.FC<SpotifyPlaylistProps> = ({
  coverImage,
  image,
  postImage,
  thumbnail,
  playlistName,
  name,
  headline,
  title,
  creatorName,
  brandName,
  username,
  description,
  text,
  body,
  caption,
  trackCount,
  tracks,
  duration = '2 h 34 min',
  track1Title = 'Faixa Um',
  track1Artist = 'Artista Um',
  track1Image,
  track1Duration = '3:45',
  track2Title = 'Faixa Dois',
  track2Artist = 'Artista Dois',
  track2Image,
  track2Duration = '4:12',
  track3Title = 'Faixa Três',
  track3Artist = 'Artista Três',
  track3Image,
  track3Duration = '3:58',
  darkMode = true,
}) => {
  const [hoveredTrack, setHoveredTrack] = useState<number | null>(null);
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);

  const displayCover = coverImage || image || postImage || thumbnail || '';
  const displayName = playlistName || name || headline || title || 'Nome da Playlist';
  const displayCreator = creatorName || brandName || username || 'Criador';
  const displayDesc = description || text || body || caption || '';
  const rawCount = trackCount ?? tracks ?? 42;
  const countLabel = String(rawCount);

  const bg = darkMode ? DARK_BG : '#FFFFFF';
  const cardBg = darkMode ? CARD_BG : '#F7F7F7';
  const textColor = darkMode ? LIGHT_TEXT : '#121212';
  const subtitleColor = darkMode ? GRAY_TEXT : '#6A6A6A';
  const trackHoverBg = darkMode ? HOVER_BG : '#EBEBEB';
  const trackBorder = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  const fontFamily = '"Circular", "Helvetica Neue", Helvetica, Arial, sans-serif';

  const trackItems = [
    { num: 1, title: track1Title, artist: track1Artist, img: track1Image, dur: track1Duration },
    { num: 2, title: track2Title, artist: track2Artist, img: track2Image, dur: track2Duration },
    { num: 3, title: track3Title, artist: track3Artist, img: track3Image, dur: track3Duration },
  ];

  return (
    <div
      style={{
        width: 280,
        maxWidth: '100%',
        background: bg,
        borderRadius: 8,
        overflow: 'hidden',
        fontFamily,
        boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.15)',
        color: textColor,
      }}
    >
      {/* ── Cover art block ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1' }}>
        {/* Cover image */}
        {displayCover ? (
          <img
            src={displayCover}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1ED760 0%, #117A34 40%, #064D20 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="72" height="72" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}

        {/* Gradient overlay at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '50%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
          }}
        />

        {/* Spotify logo top-right */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 24,
            height: 24,
          }}
        >
          <svg viewBox="0 0 24 24" fill={SPOTIFY_GREEN} width="24" height="24">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
        </div>

        {/* Play button bottom-right */}
        <button
          type="button"
          aria-label="Reproduzir playlist"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 44,
            height: 44,
            background: SPOTIFY_GREEN,
            border: 'none',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* ── Playlist info ── */}
      <div style={{ padding: '14px 14px 6px', background: cardBg }}>
        <h2
          style={{
            margin: '0 0 3px',
            fontSize: 16,
            fontWeight: 700,
            color: textColor,
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayName}
        </h2>
        <p style={{ margin: '0 0 2px', fontSize: 12, color: subtitleColor }}>
          por <span style={{ fontWeight: 600 }}>{displayCreator}</span> · Playlist Pública
        </p>
        {displayDesc && (
          <p
            style={{
              margin: '4px 0 2px',
              fontSize: 11,
              color: subtitleColor,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.4,
            }}
          >
            {displayDesc}
          </p>
        )}
        <p style={{ margin: '4px 0 0', fontSize: 11, color: darkMode ? DARK_GRAY : '#888' }}>
          {countLabel} músicas · {duration}
        </p>
      </div>

      {/* ── Track list ── */}
      <div style={{ background: cardBg, paddingBottom: 8 }}>
        {/* Divider */}
        <div style={{ height: 1, background: trackBorder, margin: '0 14px 4px' }} />

        {trackItems.map((track) => (
          <div
            key={track.num}
            onMouseEnter={() => setHoveredTrack(track.num)}
            onMouseLeave={() => setHoveredTrack(null)}
            onClick={() => setPlayingTrack(p => p === track.num ? null : track.num)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 14px',
              background: hoveredTrack === track.num ? trackHoverBg : 'transparent',
              cursor: 'pointer',
              transition: 'background 0.15s',
              borderRadius: 4,
              margin: '0 4px',
            }}
          >
            {/* Track number or playing indicator */}
            <div
              style={{
                width: 16,
                textAlign: 'center',
                fontSize: 12,
                color: playingTrack === track.num ? SPOTIFY_GREEN : subtitleColor,
                flexShrink: 0,
                fontWeight: playingTrack === track.num ? 700 : 400,
              }}
            >
              {playingTrack === track.num ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill={SPOTIFY_GREEN}>
                  <rect x="3" y="4" width="4" height="16" rx="1" />
                  <rect x="10" y="4" width="4" height="16" rx="1" />
                  <rect x="17" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                track.num
              )}
            </div>

            {/* Track image (32×32) */}
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 3,
                overflow: 'hidden',
                flexShrink: 0,
                background: darkMode ? '#535353' : '#DDDDDD',
              }}
            >
              {track.img ? (
                <img src={track.img} alt={track.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${SPOTIFY_GREEN}44 0%, #064D2044 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={SPOTIFY_GREEN}>
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title + artist */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 500,
                  color: playingTrack === track.num ? SPOTIFY_GREEN : textColor,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                }}
              >
                {track.title}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  color: subtitleColor,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {track.artist}
              </p>
            </div>

            {/* Duration */}
            <span style={{ fontSize: 11, color: subtitleColor, flexShrink: 0 }}>{track.dur}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
