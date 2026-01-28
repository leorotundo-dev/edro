import React from 'react';
import { Play } from 'lucide-react';

interface SpotifyPlaylistProps {
  coverImage?: string;
  playlistName?: string;
  description?: string;
  tracks?: number;
}

export const SpotifyPlaylist: React.FC<SpotifyPlaylistProps> = ({
  coverImage = '',
  playlistName = 'Playlist Name',
  description = 'Playlist description',
  tracks = 50,
}) => {
  return (
    <div className="w-full max-w-[300px] bg-gradient-to-b from-gray-800 to-black rounded-lg p-6 shadow-lg">
      <div className="relative w-full aspect-square bg-gray-700 rounded shadow-xl mb-6">
        {coverImage && <img src={coverImage} alt={playlistName} className="w-full h-full object-cover rounded" />}
      </div>
      <h2 className="text-white font-bold text-2xl mb-2">{playlistName}</h2>
      <p className="text-gray-400 text-sm mb-4">{description}</p>
      <p className="text-gray-400 text-xs mb-6">{tracks} songs</p>
      <button className="w-14 h-14 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center shadow-lg">
        <Play className="w-6 h-6 text-black fill-black ml-1" />
      </button>
    </div>
  );
};
