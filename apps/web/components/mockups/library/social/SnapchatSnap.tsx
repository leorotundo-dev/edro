import React from 'react';

interface SnapchatSnapProps {
  username?: string;
  snapImage?: string;
  caption?: string;
}

export const SnapchatSnap: React.FC<SnapchatSnapProps> = ({
  username = 'username',
  snapImage = '',
  caption = '',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {snapImage && <img src={snapImage} alt="Snap" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40" />
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-gray-200" />
          <span className="text-white font-semibold text-sm drop-shadow-lg">{username}</span>
        </div>
        <span className="text-white text-xs drop-shadow-lg">2s</span>
      </div>
      {caption && (
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white text-center font-semibold drop-shadow-lg">{caption}</p>
        </div>
      )}
    </div>
  );
};
