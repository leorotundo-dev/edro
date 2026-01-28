import React from 'react';

interface InstagramStoryMockupProps {
  username?: string;
  profileImage?: string;
  storyImage?: string;
  timeAgo?: string;
}

export const InstagramStoryMockup: React.FC<InstagramStoryMockupProps> = ({
  username = 'username',
  profileImage = '',
  storyImage = '',
  timeAgo = '3h'
}) => {
  return (
    <div className="w-[375px] h-[667px] bg-black rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative">
      {/* Story Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        {/* Progress Bar */}
        <div className="flex gap-1 mb-3">
          <div className="flex-1 h-0.5 bg-white rounded-full" />
          <div className="flex-1 h-0.5 bg-white/30 rounded-full" />
          <div className="flex-1 h-0.5 bg-white/30 rounded-full" />
        </div>

        {/* User Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white p-[2px]">
              {profileImage ? (
                <img src={profileImage} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-300" />
              )}
            </div>
            <span className="text-white font-semibold text-sm drop-shadow-lg">{username}</span>
            <span className="text-white/70 text-sm drop-shadow-lg">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1"/>
              <circle cx="12" cy="12" r="1"/>
              <circle cx="12" cy="19" r="1"/>
            </svg>
            <svg className="w-6 h-6 text-white drop-shadow-lg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Story Content */}
      <div className="flex-1 relative flex items-center justify-center">
        {storyImage ? (
          <img src={storyImage} alt="Story" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <svg className="w-20 h-20 text-gray-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="M21 15l-5-5L5 21"/>
            </svg>
          </div>
        )}
      </div>

      {/* Story Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-3 border border-white/20">
          <input 
            type="text" 
            placeholder="Send message"
            className="flex-1 bg-transparent text-white placeholder-white/60 outline-none text-sm"
            readOnly
          />
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
          </svg>
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </div>
      </div>
    </div>
  );
};
