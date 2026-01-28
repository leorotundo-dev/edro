import React from 'react';
import { Heart, Gift, Share2 } from 'lucide-react';

interface TikTokLiveProps {
  username?: string;
  profileImage?: string;
  liveImage?: string;
  viewers?: string;
}

export const TikTokLive: React.FC<TikTokLiveProps> = ({
  username = '@username',
  profileImage = '',
  liveImage = '',
  viewers = '3.2K',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {liveImage && <img src={liveImage} alt="Live" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />
      
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-pink-500 bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm">{username}</span>
          <button className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded">Follow</button>
        </div>
        <div className="bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="absolute top-20 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        👁️ {viewers}
      </div>

      <div className="absolute right-3 bottom-20 flex flex-col gap-4">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
};
