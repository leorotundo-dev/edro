import React from 'react';

interface PinterestStoryProps {
  storyImage?: string;
  creatorName?: string;
  creatorImage?: string;
}

export const PinterestStory: React.FC<PinterestStoryProps> = ({
  storyImage = '',
  creatorName = 'Creator Name',
  creatorImage = '',
}) => {
  return (
    <div className="relative w-[200px] h-[356px] bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
      {storyImage && <img src={storyImage} alt="Story" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
      
      <div className="absolute top-4 left-4 right-4">
        <div className="w-full h-1 bg-white/30 rounded-full mb-3">
          <div className="w-full h-full bg-white rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            {creatorImage && <img src={creatorImage} alt={creatorName} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm drop-shadow-lg">{creatorName}</span>
        </div>
      </div>
    </div>
  );
};
