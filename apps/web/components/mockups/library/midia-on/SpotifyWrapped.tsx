import React from 'react';

interface SpotifyWrappedProps {
  year?: number;
  topArtist?: string;
  topSong?: string;
  minutesListened?: string;
  topGenre?: string;
}

export const SpotifyWrapped: React.FC<SpotifyWrappedProps> = ({
  year = 2026,
  topArtist = 'Top Artist Name',
  topSong = 'Top Song Title',
  minutesListened = '45,678',
  topGenre = 'Pop',
}) => {
  return (
    <div className="w-full max-w-[375px] h-[667px] bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-lg overflow-hidden shadow-2xl p-8 flex flex-col justify-center text-white">
      <div className="text-center">
        <h1 className="text-5xl font-black mb-2">{year}</h1>
        <h2 className="text-2xl font-bold mb-12">Wrapped</h2>
        
        <div className="space-y-8">
          <div>
            <p className="text-sm opacity-80 mb-1">Your Top Artist</p>
            <p className="text-3xl font-bold">{topArtist}</p>
          </div>
          
          <div>
            <p className="text-sm opacity-80 mb-1">Your Top Song</p>
            <p className="text-2xl font-bold">{topSong}</p>
          </div>
          
          <div>
            <p className="text-sm opacity-80 mb-1">Minutes Listened</p>
            <p className="text-4xl font-black">{minutesListened}</p>
          </div>
          
          <div>
            <p className="text-sm opacity-80 mb-1">Your Top Genre</p>
            <p className="text-2xl font-bold">{topGenre}</p>
          </div>
        </div>
        
        <div className="mt-12">
          <p className="text-xs opacity-60">Share your Wrapped</p>
        </div>
      </div>
    </div>
  );
};
