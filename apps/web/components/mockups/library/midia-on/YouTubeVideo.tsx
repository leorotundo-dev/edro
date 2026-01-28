import React from 'react';
import { Play } from 'lucide-react';

interface YouTubeVideoProps {
  thumbnail?: string;
  title?: string;
  channelName?: string;
  channelImage?: string;
  views?: string;
  timeAgo?: string;
}

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  thumbnail = '',
  title = 'Video Title Goes Here',
  channelName = 'Channel Name',
  channelImage = '',
  views = '1.2M views',
  timeAgo = '2 days ago',
}) => {
  return (
    <div className="w-full max-w-[360px] bg-white">
      <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">4:32</div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{title}</h3>
          <p className="text-xs text-gray-600 mt-1">{channelName}</p>
          <p className="text-xs text-gray-600">{views} · {timeAgo}</p>
        </div>
      </div>
    </div>
  );
};
