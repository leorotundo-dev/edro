import React from 'react';

interface YouTubeVideoProps {
  thumbnail?: string;
  title?: string;
  headline?: string;
  channelName?: string;
  channelImage?: string;
  views?: string | number;
  timeAgo?: string;
  /** Video duration label, e.g. "4:32" */
  duration?: string;
  /** Show full player UI (default: card/thumbnail view) */
  playerMode?: boolean;
}

function formatViews(v: string | number): string {
  if (typeof v === 'string') return v;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} mi de visualizações`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} mil visualizações`;
  return `${v} visualizações`;
}

// YouTube's actual play button shape: rounded rectangle
const YTPlayButton = () => (
  <div style={{
    width: 64, height: 44,
    background: 'rgba(255,0,0,0.90)',
    borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
  }}>
    {/* Official YouTube play triangle */}
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
      <path d="M8 5v14l11-7z" />
    </svg>
  </div>
);

// Verified checkmark (YouTube grey)
const VerifiedBadge = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#AAAAAA">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
);

// Three-dot menu
const ThreeDots = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#606060">
    <circle cx="12" cy="5" r="1.5" />
    <circle cx="12" cy="12" r="1.5" />
    <circle cx="12" cy="19" r="1.5" />
  </svg>
);

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  thumbnail = '',
  title,
  headline,
  channelName = 'Canal',
  channelImage = '',
  views = '1.2M',
  timeAgo = 'há 2 dias',
  duration = '4:32',
  playerMode = false,
}) => {
  const displayTitle = title || headline || 'Título do Vídeo';

  if (playerMode) {
    // Full player view (for in-stream ads)
    return (
      <div style={{
        width: 380,
        background: '#0f0f0f',
        borderRadius: 12,
        overflow: 'hidden',
        fontFamily: '"YouTube Noto", Roboto, Arial, sans-serif',
        color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Video area */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
          {thumbnail ? (
            <img src={thumbnail} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <YTPlayButton />
            </div>
          )}
          {/* Player controls overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            padding: '32px 12px 8px',
          }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, marginBottom: 8, position: 'relative' }}>
              <div style={{ width: '38%', height: '100%', background: '#FF0000', borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -5, top: '50%', transform: 'translateY(-50%)', width: 11, height: 11, borderRadius: '50%', background: '#FF0000' }} />
              </div>
            </div>
            {/* Controls row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Play */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
              {/* Skip */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
              {/* Volume */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" /></svg>
              <span style={{ fontSize: 12, flex: 1 }}>1:42 / {duration}</span>
              {/* Settings */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" /></svg>
              {/* Fullscreen */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" /></svg>
            </div>
          </div>
          {/* Duration badge */}
          <div style={{ position: 'absolute', bottom: 52, right: 8, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 12, padding: '2px 5px', borderRadius: 3, fontWeight: 600 }}>
            {duration}
          </div>
        </div>

        {/* Below video: title + channel */}
        <div style={{ padding: '12px 14px' }}>
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, margin: '0 0 10px', color: '#fff' }}>
            {displayTitle}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: '#333', flexShrink: 0 }}>
              {channelImage && <img src={channelImage} alt={channelName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <span style={{ fontSize: 13, color: '#aaa' }}>{channelName}</span>
          </div>
        </div>
      </div>
    );
  }

  // Default: feed card (Discovery Ad style)
  return (
    <div style={{
      width: 360,
      background: '#fff',
      fontFamily: '"YouTube Noto", Roboto, Arial, sans-serif',
    }}>
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 12, overflow: 'hidden' }}>
        {thumbnail ? (
          <img src={thumbnail} alt={displayTitle} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <YTPlayButton />
          </div>
        )}
        {/* Duration badge */}
        <div style={{
          position: 'absolute', bottom: 8, right: 8,
          background: 'rgba(0,0,0,0.85)',
          color: '#fff',
          fontSize: 12, fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
        }}>
          {duration}
        </div>
      </div>

      {/* Metadata row */}
      <div style={{ display: 'flex', gap: 12, padding: '10px 2px 0' }}>
        {/* Channel avatar */}
        <div style={{
          width: 36, height: 36,
          borderRadius: '50%',
          overflow: 'hidden',
          background: '#e0e0e0',
          flexShrink: 0,
          marginTop: 2,
        }}>
          {channelImage && <img src={channelImage} alt={channelName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>

        {/* Title + channel + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 14, fontWeight: 600,
            color: '#0f0f0f',
            lineHeight: 1.4,
            margin: '0 0 4px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {displayTitle}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 13, color: '#606060' }}>{channelName}</span>
            <VerifiedBadge />
          </div>
          <p style={{ fontSize: 13, color: '#606060', margin: 0 }}>
            {formatViews(views)} • {timeAgo}
          </p>
        </div>

        {/* Three-dot menu */}
        <button type="button" aria-label="Mais opções" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', alignSelf: 'flex-start' }}>
          <ThreeDots />
        </button>
      </div>
    </div>
  );
};
