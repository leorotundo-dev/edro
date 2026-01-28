import React from 'react';
import { Heart, X } from 'lucide-react';

interface InstagramLiveProps {
  username?: string;
  profileImage?: string;
  liveImage?: string;
  viewers?: string;
}

export const InstagramLive: React.FC<InstagramLiveProps> = ({
  username = 'username',
  profileImage = '',
  liveImage = '',
  viewers = '1.2K',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {liveImage && <img src={liveImage} alt="Live" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
      
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold">LIVE</span>
          </div>
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {viewers}
          </div>
        </div>
        <button className="text-white">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm">{username}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Comment..."
            className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-white placeholder-white/70 text-sm"
            readOnly
          />
          <button className="text-white">
            <Heart className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};
