import React from 'react';

interface YouTubeLiveProps {
  thumbnail?: string;
  title?: string;
  channelName?: string;
  channelImage?: string;
  viewers?: string;
}

export const YouTubeLive: React.FC<YouTubeLiveProps> = ({
  thumbnail = '',
  title = 'Live Stream Title',
  channelName = 'Channel Name',
  channelImage = '',
  viewers = '2.4K watching',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          LIVE
        </div>
        <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {viewers}
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
