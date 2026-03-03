import React from 'react';

interface InstagramLiveProps {
  username?: string;
  profileImage?: string;
  liveImage?: string;
  postImage?: string;
  thumbnail?: string;
  viewers?: string;
}

export const InstagramLive: React.FC<InstagramLiveProps> = ({
  username = 'username',
  profileImage = '',
  liveImage = '',
  postImage,
  thumbnail,
  viewers = '1.2K',
}) => {
  const resolvedLiveImage = postImage ?? thumbnail ?? liveImage;

  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {resolvedLiveImage && <img src={resolvedLiveImage} alt="Live" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60" />

      <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white text-xs font-semibold">LIVE</span>
          </div>
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-full">
            {viewers}
          </div>
        </div>
        <button className="text-white">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
          <span className="text-white font-semibold text-sm">{username}</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Comment..."
            className="flex-1 bg-transparent border border-white/50 rounded-full px-4 py-2 text-white placeholder-white/70 text-sm"
            readOnly
          />
          <button className="text-white">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
