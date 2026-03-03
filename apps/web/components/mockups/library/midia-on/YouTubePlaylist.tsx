import React from 'react';

interface YouTubePlaylistProps {
  playlistImage?: string;
  postImage?: string;
  thumbnail?: string;
  playlistName?: string;
  title?: string;
  headline?: string;
  name?: string;
  channelName?: string;
  videoCount?: number;
}

export const YouTubePlaylist: React.FC<YouTubePlaylistProps> = ({
  playlistImage = '',
  postImage,
  thumbnail,
  playlistName = 'Playlist Name',
  title,
  headline,
  name,
  channelName = 'Channel Name',
  videoCount = 24,
}) => {
  const resolvedPlaylistImage = postImage ?? thumbnail ?? playlistImage;
  const resolvedPlaylistName = title ?? headline ?? name ?? playlistName;

  return (
    <div className="w-full max-w-[300px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-video bg-gray-900">
        {resolvedPlaylistImage && <img src={resolvedPlaylistImage} alt={resolvedPlaylistName} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        </div>
        <div className="absolute bottom-0 right-0 bg-black/90 text-white text-xs px-2 py-1">
          {videoCount} videos
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{resolvedPlaylistName}</h3>
        <p className="text-xs text-gray-600">{channelName}</p>
        <button className="mt-2 text-xs text-gray-900 font-semibold">VIEW FULL PLAYLIST</button>
      </div>
    </div>
  );
};
