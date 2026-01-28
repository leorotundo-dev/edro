import React from 'react';
import { Play } from 'lucide-react';

interface SpotifyArtistProps {
  artistImage?: string;
  artistName?: string;
  monthlyListeners?: string;
  isVerified?: boolean;
}

export const SpotifyArtist: React.FC<SpotifyArtistProps> = ({
  artistImage = '',
  artistName = 'Artist Name',
  monthlyListeners = '12.4M',
  isVerified = true,
}) => {
  return (
    <div className="w-full max-w-[300px] bg-gradient-to-b from-green-600 to-black rounded-lg overflow-hidden shadow-lg">
      <div className="p-6 text-center">
        <div className="w-40 h-40 mx-auto rounded-full bg-gray-800 overflow-hidden mb-4 shadow-xl">
          {artistImage && <img src={artistImage} alt={artistName} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-2">
          <h2 className="text-3xl font-bold text-white">{artistName}</h2>
          {isVerified && (
            <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          )}
        </div>
        
        <p className="text-sm text-gray-300 mb-6">{monthlyListeners} monthly listeners</p>
        
        <button className="bg-green-500 hover:bg-green-600 text-black font-bold py-3 px-8 rounded-full flex items-center gap-2 mx-auto">
          <Play className="w-5 h-5 fill-black" />
          Play
        </button>
      </div>
    </div>
  );
};
