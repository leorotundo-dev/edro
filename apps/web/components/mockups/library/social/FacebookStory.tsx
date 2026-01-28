import React from 'react';

interface FacebookStoryProps {
  username?: string;
  profileImage?: string;
  storyImage?: string;
}

export const FacebookStory: React.FC<FacebookStoryProps> = ({
  username = 'Username',
  profileImage = '',
  storyImage = '',
}) => {
  return (
    <div className="relative w-[200px] h-[356px] bg-gray-900 rounded-xl overflow-hidden shadow-sm">
      {/* Story Image */}
      {storyImage && (
        <img src={storyImage} alt="Story" className="absolute inset-0 w-full h-full object-cover" />
      )}
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
      
      {/* Header */}
      <div className="absolute top-4 left-4 right-4 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
          {profileImage && (
            <img src={profileImage} alt={username} className="w-full h-full object-cover" />
          )}
        </div>
        <span className="text-white text-sm font-semibold drop-shadow-lg">{username}</span>
      </div>
    </div>
  );
};
