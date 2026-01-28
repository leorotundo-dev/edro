import React from 'react';
import { ChevronRight } from 'lucide-react';

interface PinterestIdeaPinProps {
  pages?: string[];
  title?: string;
  creatorName?: string;
  creatorImage?: string;
}

export const PinterestIdeaPin: React.FC<PinterestIdeaPinProps> = ({
  pages = ['', '', ''],
  title = 'Idea Pin Title',
  creatorName = 'Creator Name',
  creatorImage = '',
}) => {
  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="relative w-full aspect-[9/16] bg-gray-200">
        {pages[0] && <img src={pages[0]} alt="Page 1" className="w-full h-full object-cover" />}
        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          1/{pages.length}
        </div>
        <button className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-gray-900" />
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{title}</h3>
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
            {creatorImage && <img src={creatorImage} alt={creatorName} className="w-full h-full object-cover" />}
          </div>
          <span className="text-xs text-gray-600">{creatorName}</span>
        </div>
      </div>
    </div>
  );
};
