import React from 'react';

interface TikTokDuetProps {
  leftVideo?: string;
  rightVideo?: string;
  leftUsername?: string;
  rightUsername?: string;
}

export const TikTokDuet: React.FC<TikTokDuetProps> = ({
  leftVideo = '',
  rightVideo = '',
  leftUsername = '@user1',
  rightUsername = '@user2',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      <div className="flex h-full">
        <div className="relative w-1/2 h-full bg-gray-900 border-r border-white/20">
          {leftVideo && <img src={leftVideo} alt="Left" className="w-full h-full object-cover" />}
          <div className="absolute bottom-4 left-2 right-2">
            <p className="text-white text-xs font-semibold drop-shadow-lg">{leftUsername}</p>
          </div>
        </div>
        <div className="relative w-1/2 h-full bg-gray-900">
          {rightVideo && <img src={rightVideo} alt="Right" className="w-full h-full object-cover" />}
          <div className="absolute bottom-4 left-2 right-2">
            <p className="text-white text-xs font-semibold drop-shadow-lg">{rightUsername}</p>
          </div>
        </div>
      </div>
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
        Duet
      </div>
    </div>
  );
};
