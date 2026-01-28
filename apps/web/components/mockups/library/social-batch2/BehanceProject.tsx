import React from 'react';
import { Eye, ThumbsUp } from 'lucide-react';

interface BehanceProjectProps {
  projectImage?: string;
  projectTitle?: string;
  creatorName?: string;
  creatorAvatar?: string;
  likes?: number;
  views?: number;
}

export const BehanceProject: React.FC<BehanceProjectProps> = ({
  projectImage = '',
  projectTitle = 'Project Title',
  creatorName = 'Creator Name',
  creatorAvatar = '',
  likes = 234,
  views = 1234,
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-[4/3] bg-gray-200">
        {projectImage && <img src={projectImage} alt={projectTitle} className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-base text-gray-900 mb-3 line-clamp-2">{projectTitle}</h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              {creatorAvatar && <img src={creatorAvatar} alt={creatorName} className="w-full h-full object-cover" />}
            </div>
            <span className="text-sm text-gray-700">{creatorName}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{views}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
