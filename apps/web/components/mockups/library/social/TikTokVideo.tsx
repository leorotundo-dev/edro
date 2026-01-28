import React from 'react';
import { Heart, MessageCircle, Share2, Music } from 'lucide-react';

interface TikTokVideoProps {
  thumbnail?: string;
  username?: string;
  profileImage?: string;
  caption?: string;
  likes?: string;
  comments?: string;
  shares?: string;
}

export const TikTokVideo: React.FC<TikTokVideoProps> = ({
  thumbnail = '',
  username = '@username',
  profileImage = '',
  caption = 'Video caption goes here #fyp',
  likes = '124K',
  comments = '2.3K',
  shares = '890',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {thumbnail && <img src={thumbnail} alt="Video" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      <div className="absolute bottom-0 left-0 right-16 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm">{username}</span>
        </div>
        <p className="text-white text-sm">{caption}</p>
        <div className="flex items-center gap-2 mt-2">
          <Music className="w-4 h-4 text-white" />
          <p className="text-white text-xs">Original sound</p>
        </div>
      </div>
      <div className="absolute right-3 bottom-20 flex flex-col gap-4">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{likes}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs font-semibold">{shares}</span>
        </button>
      </div>
    </div>
  );
};
