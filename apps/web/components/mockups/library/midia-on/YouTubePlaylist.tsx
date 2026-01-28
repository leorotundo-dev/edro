import React from 'react';
import { PlayCircle } from 'lucide-react';

interface YouTubePlaylistProps {
  playlistImage?: string;
  playlistName?: string;
  channelName?: string;
  videoCount?: number;
}

export const YouTubePlaylist: React.FC<YouTubePlaylistProps> = ({
  playlistImage = '',
  playlistName = 'Playlist Name',
  channelName = 'Channel Name',
  videoCount = 24,
}) => {
  return (
    <div className="w-full max-w-[300px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-video bg-gray-900">
        {playlistImage && <img src={playlistImage} alt={playlistName} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <PlayCircle className="w-16 h-16 text-white" />
        </div>
        <div className="absolute bottom-0 right-0 bg-black/90 text-white text-xs px-2 py-1">
          {videoCount} videos
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{playlistName}</h3>
        <p className="text-xs text-gray-600">{channelName}</p>
        <button className="mt-2 text-xs text-gray-900 font-semibold">VIEW FULL PLAYLIST</button>
      </div>
    </div>
  );
};
