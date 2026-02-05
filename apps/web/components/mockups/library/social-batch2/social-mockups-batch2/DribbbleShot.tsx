import React from 'react';
import { Heart, Eye } from 'lucide-react';

interface DribbbleShotProps {
  shotImage?: string;
  title?: string;
  designerName?: string;
  designerAvatar?: string;
  likes?: number;
  views?: number;
}

export const DribbbleShot: React.FC<DribbbleShotProps> = ({
  shotImage = '',
  title = 'Shot Title',
  designerName = 'Designer Name',
  designerAvatar = '',
  likes = 123,
  views = 1234,
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-[4/3] bg-gray-200 group">
        {shotImage && <img src={shotImage} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              {designerAvatar && <img src={designerAvatar} alt={designerName} className="w-full h-full object-cover" />}
            </div>
            <span className="text-sm font-semibold text-gray-900">{designerName}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{views}</span>
            </div>
          </div>
        </div>
        
        <h3 className="text-sm text-gray-700 line-clamp-1">{title}</h3>
      </div>
    </div>
  );
};
