import React from 'react';

interface SnapchatStoryProps {
  username?: string;
  profileImage?: string;
  storyImage?: string;
}

export const SnapchatStory: React.FC<SnapchatStoryProps> = ({
  username = 'username',
  profileImage = '',
  storyImage = '',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {storyImage && <img src={storyImage} alt="Story" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute top-4 left-4 right-4">
        <div className="w-full h-1 bg-white/30 rounded-full mb-3">
          <div className="w-full h-full bg-white rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm drop-shadow-lg">{username}</span>
        </div>
      </div>
    </div>
  );
};
