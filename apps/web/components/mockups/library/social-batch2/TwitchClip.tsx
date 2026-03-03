import React from 'react';

interface TwitchClipProps {
  thumbnail?: string;
  image?: string;
  postImage?: string;
  clipTitle?: string;
  title?: string;
  headline?: string;
  caption?: string;
  name?: string;
  streamerName?: string;
  username?: string;
  views?: string;
  duration?: string;
}

export const TwitchClip: React.FC<TwitchClipProps> = ({
  thumbnail,
  image,
  postImage,
  clipTitle,
  title,
  headline,
  caption,
  name,
  streamerName,
  username,
  views = '12,4K',
  duration = '0:30',
}) => {
  const displayThumbnail = thumbnail || image || postImage || '';
  const displayTitle = clipTitle || title || headline || caption || name || 'Momento Épico!';
  const displayStreamer = streamerName || username || 'NomeDoStreamer';

  return (
    <div style={{ width: '100%', maxWidth: 300, background: '#18181B', borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', cursor: 'pointer', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#0E0E10' }}>
        {displayThumbnail && (
          <img src={displayThumbnail} alt={displayTitle} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.9)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#18181B" style={{ marginLeft: 3 }}>
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          </div>
        </div>
        <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 3, fontWeight: 600 }}>
          {duration}
        </div>
      </div>
      <div style={{ padding: 12 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: '#EFEFF1', margin: '0 0 4px', lineHeight: 1.4 }}>{displayTitle}</p>
        <p style={{ fontSize: 12, color: '#ADADB8', margin: 0 }}>{displayStreamer}</p>
        <p style={{ fontSize: 12, color: '#7D7D8E', margin: '4px 0 0' }}>{views} visualizações</p>
      </div>
    </div>
  );
};
