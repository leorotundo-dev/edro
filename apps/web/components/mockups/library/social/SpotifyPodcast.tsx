import React from 'react';

interface SpotifyPodcastProps {
  coverImage?: string;
  image?: string;
  postImage?: string;
  podcastName?: string;
  name?: string;
  headline?: string;
  host?: string;
  username?: string;
  episodes?: number | string;
}

export const SpotifyPodcast: React.FC<SpotifyPodcastProps> = ({
  coverImage,
  image,
  postImage,
  podcastName,
  name,
  headline,
  host,
  username,
  episodes = 120,
}) => {
  const displayCover = coverImage || image || postImage || '';
  const displayName = podcastName || name || headline || 'Nome do Podcast';
  const displayHost = host || username || 'Apresentador';

  return (
    <div style={{ width: 300, maxWidth: '100%', background: 'linear-gradient(180deg, #282828 0%, #121212 100%)', borderRadius: 8, padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontFamily: '"Circular", Helvetica, Arial, sans-serif' }}>
      {/* Cover */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#535353', borderRadius: 4, overflow: 'hidden', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {displayCover ? (
          <img src={displayCover} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#535353' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#B3B3B3"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
          </div>
        )}
      </div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 22, margin: '0 0 4px', lineHeight: '28px' }}>{displayName}</h2>
      <p style={{ color: '#B3B3B3', fontSize: 14, margin: '0 0 4px' }}>{displayHost}</p>
      <p style={{ color: '#B3B3B3', fontSize: 12, margin: '0 0 24px' }}>{episodes} episódios</p>
      {/* Play */}
      <button type="button" aria-label="Reproduzir" style={{ width: 56, height: 56, background: '#1DB954', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z" /></svg>
      </button>
    </div>
  );
};
