import React from 'react';
import { Play, Clock } from 'lucide-react';

interface YouTubePremiereProps {
  thumbnail?: string;
  title?: string;
  channelName?: string;
  channelImage?: string;
  premiereDate?: string;
  premiereTime?: string;
}

export const YouTubePremiere: React.FC<YouTubePremiereProps> = ({
  thumbnail = '',
  title = 'Video Premiere Title',
  channelName = 'Channel Name',
  channelImage = '',
  premiereDate = 'Jan 27',
  premiereTime = '7:00 PM',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-3">
            <Play className="w-8 h-8 text-white fill-white ml-1" />
          </div>
          <div className="bg-red-600 text-white px-3 py-1 rounded font-semibold text-sm">
            PREMIERE
          </div>
        </div>
        <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {premiereDate} at {premiereTime}
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{title}</h3>
            <p className="text-xs text-gray-600">{channelName}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
