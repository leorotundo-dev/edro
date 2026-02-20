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
  timeAgo = '2h',
}) => {
  return (
    <div
      className="w-full max-w-[360px] bg-gray-800 rounded-xl overflow-hidden shadow-lg relative border border-gray-200 font-sans text-white"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Background media */}
      <div className="absolute inset-0 w-full h-full bg-gray-300 flex items-center justify-center">
        {storyImage ? (
          <img src={storyImage} alt="Story" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-sm">Mídia Vertical</span>
        )}
      </div>

      {/* Top gradient overlay */}
      <div className="absolute top-0 w-full h-24 bg-gradient-to-b from-black/50 to-transparent z-10 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 w-full z-20 px-3 pt-3 flex flex-col gap-2">
        {/* Progress segments */}
        <div className="w-full flex gap-1">
          <div className="h-[2px] bg-white rounded-full flex-1" />
          <div className="h-[2px] bg-white/40 rounded-full flex-1" />
        </div>

        {/* User row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {profileImage ? (
              <img
                src={profileImage}
                alt={username}
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/30 border border-white/20" />
            )}
            <span className="font-semibold text-[13px] drop-shadow-md">{username}</span>
            <span className="text-[13px] text-white/80 drop-shadow-md">{timeAgo}</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="6" cy="12" r="1.5" />
              <circle cx="18" cy="12" r="1.5" />
            </svg>
            <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom gradient overlay */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />

      {/* Bottom bar: message input + heart */}
      <div className="absolute bottom-0 w-full z-20 px-3 pb-4 flex items-center gap-3">
        <div className="flex-1 h-11 rounded-full border border-white/60 flex items-center px-4 bg-black/10 backdrop-blur-sm">
          <span className="text-[14px] text-white/90">Enviar mensagem</span>
        </div>
        <svg
          className="w-7 h-7 flex-shrink-0 drop-shadow-md"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z" />
        </svg>
      </div>
    </div>
  );
};
