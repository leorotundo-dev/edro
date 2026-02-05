import React from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, Share2 } from 'lucide-react';

interface YouTubeShortsProps {
  thumbnail?: string;
  title?: string;
  views?: string;
}

export const YouTubeShorts: React.FC<YouTubeShortsProps> = ({
  thumbnail = '',
  title = 'Short video title',
  views = '2.4M views',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {thumbnail && <img src={thumbnail} alt={title} className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="text-white font-semibold text-sm mb-1">{title}</p>
        <p className="text-white/80 text-xs">{views}</p>
      </div>
      <div className="absolute right-3 bottom-20 flex flex-col gap-4">
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <ThumbsUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs">Like</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <ThumbsDown className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs">Dislike</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs">Comment</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-white text-xs">Share</span>
        </button>
      </div>
    </div>
  );
};
