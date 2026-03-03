import React from 'react';

interface YouTubePlaylistProps {
  playlistImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  playlistName?: string;
  name?: string;
  headline?: string;
  title?: string;
  channelName?: string;
  username?: string;
  brandName?: string;
  videoCount?: number | string;
}

export const YouTubePlaylist: React.FC<YouTubePlaylistProps> = ({
  playlistImage,
  image,
  postImage,
  thumbnail,
  playlistName,
  name,
  headline,
  title,
  channelName,
  username,
  brandName,
  videoCount = 24,
}) => {
  const displayImage = playlistImage || image || postImage || thumbnail || '';
  const displayName = playlistName || name || headline || title || 'Nome da Playlist';
  const displayChannel = channelName || username || brandName || 'Nome do Canal';

  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', cursor: 'pointer', fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif', color: '#0F0F0F' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0F0F0F' }}>
        {displayImage && (
          <img src={displayImage} alt={displayName} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8" fill="rgba(255,255,255,0.9)" stroke="none"/>
          </svg>
        </div>
        <div style={{ position: 'absolute', bottom: 0, right: 0, background: 'rgba(0,0,0,0.9)', color: '#fff', fontSize: 11, padding: '4px 8px', fontWeight: 500 }}>
          {videoCount} vídeos
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <h3 style={{ fontWeight: 600, fontSize: 14, color: '#0F0F0F', margin: '0 0 4px', lineHeight: 1.4 }}>{displayName}</h3>
        <p style={{ fontSize: 12, color: '#606060', margin: 0 }}>{displayChannel}</p>
        <button type="button" style={{ marginTop: 8, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#0F0F0F', padding: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ver playlist completa
        </button>
      </div>
    </div>
  );
};
