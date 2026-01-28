import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, Music } from 'lucide-react';

interface InstagramReelProps {
  username?: string;
  profileImage?: string;
  reelImage?: string;
  caption?: string;
  likes?: string;
  comments?: string;
  audioName?: string;
}

export const InstagramReel: React.FC<InstagramReelProps> = ({
  username = 'username',
  profileImage = '',
  reelImage = '',
  caption = 'Reel caption goes here',
  likes = '12.4K',
  comments = '234',
  audioName = 'Original audio',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {reelImage && <img src={reelImage} alt="Reel" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      
      <div className="absolute bottom-0 left-0 right-16 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm">{username}</span>
          <button className="text-white text-sm font-semibold border border-white px-3 py-0.5 rounded">Follow</button>
        </div>
        <p className="text-white text-sm mb-2">{caption}</p>
        <div className="flex items-center gap-2">
          <Music className="w-3 h-3 text-white" />
          <p className="text-white text-xs">{audioName}</p>
        </div>
      </div>

      <div className="absolute right-3 bottom-20 flex flex-col gap-4">
        <button className="flex flex-col items-center gap-1">
          <Heart className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-semibold">{likes}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageCircle className="w-7 h-7 text-white" />
          <span className="text-white text-xs font-semibold">{comments}</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Send className="w-7 h-7 text-white" />
        </button>
        <button className="flex flex-col items-center gap-1">
          <Bookmark className="w-7 h-7 text-white" />
        </button>
      </div>
    </div>
  );
};
