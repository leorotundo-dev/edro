import React from 'react';
import { Play } from 'lucide-react';

interface TwitchClipProps {
  thumbnail?: string;
  clipTitle?: string;
  streamerName?: string;
  views?: string;
  duration?: string;
}

export const TwitchClip: React.FC<TwitchClipProps> = ({
  thumbnail = '',
  clipTitle = 'Epic Moment!',
  streamerName = 'StreamerName',
  views = '12.4K',
  duration = '0:30',
}) => {
  return (
    <div className="w-full max-w-[300px] bg-[#18181B] rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={clipTitle} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-gray-900 fill-gray-900 ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {duration}
        </div>
      </div>
      
      <div className="p-3">
        <p className="font-semibold text-sm text-white line-clamp-2 mb-1">{clipTitle}</p>
        <p className="text-xs text-gray-400">{streamerName}</p>
        <p className="text-xs text-gray-500 mt-1">{views} views</p>
      </div>
    </div>
  );
};
