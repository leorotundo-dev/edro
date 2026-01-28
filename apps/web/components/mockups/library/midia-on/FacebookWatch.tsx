import React from 'react';
import { Play } from 'lucide-react';

interface FacebookWatchProps {
  thumbnail?: string;
  videoTitle?: string;
  pageName?: string;
  views?: string;
  duration?: string;
}

export const FacebookWatch: React.FC<FacebookWatchProps> = ({
  thumbnail = '',
  videoTitle = 'Video Title',
  pageName = 'Page Name',
  views = '1.2M views',
  duration = '5:30',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={videoTitle} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-7 h-7 text-gray-900 fill-gray-900 ml-1" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {duration}
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{videoTitle}</h3>
        <p className="text-xs text-gray-600">{pageName}</p>
        <p className="text-xs text-gray-500 mt-1">{views}</p>
      </div>
    </div>
  );
};
