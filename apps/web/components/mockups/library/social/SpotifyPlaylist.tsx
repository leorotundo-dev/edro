import React from 'react';

interface SpotifyPlaylistProps {
  coverImage?: string;
  image?: string;
  postImage?: string;
  playlistName?: string;
  name?: string;
  headline?: string;
  description?: string;
  text?: string;
  body?: string;
  caption?: string;
  tracks?: number | string;
}

export const SpotifyPlaylist: React.FC<SpotifyPlaylistProps> = ({
  coverImage,
  image,
  postImage,
  playlistName,
  name,
  headline,
  description,
  text,
  body,
  caption,
  tracks = 50,
}) => {
  const displayCover = coverImage || image || postImage || '';
  const displayName = playlistName || name || headline || 'Nome da Playlist';
  const displayDesc = description || text || body || caption || 'Descrição da playlist';

  return (
    <div style={{ width: 300, maxWidth: '100%', background: 'linear-gradient(180deg, #282828 0%, #121212 100%)', borderRadius: 8, padding: '24px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', fontFamily: '"Circular", Helvetica, Arial, sans-serif' }}>
      {/* Cover */}
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#535353', borderRadius: 4, overflow: 'hidden', marginBottom: 24, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
        {displayCover ? (
          <img src={displayCover} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#535353' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="#B3B3B3"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>
          </div>
        )}
      </div>
      <h2 style={{ color: 'white', fontWeight: 700, fontSize: 22, margin: '0 0 6px', lineHeight: '28px' }}>{displayName}</h2>
      <p style={{ color: '#B3B3B3', fontSize: 14, margin: '0 0 4px' }}>{displayDesc}</p>
      <p style={{ color: '#B3B3B3', fontSize: 12, margin: '0 0 24px' }}>{tracks} músicas</p>
      {/* Play */}
      <button type="button" aria-label="Reproduzir" style={{ width: 56, height: 56, background: '#1DB954', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.3)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#000"><path d="M8 5v14l11-7z" /></svg>
      </button>
    </div>
  );
};
