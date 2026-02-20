import React from 'react';

interface InstagramReelProps {
  username?: string;
  profileImage?: string;
  reelImage?: string;
  storyImage?: string;
  caption?: string;
  description?: string;
  likes?: string | number;
  comments?: string | number;
  audioName?: string;
}

export const InstagramReel: React.FC<InstagramReelProps> = ({
  username = 'username',
  profileImage = '',
  reelImage,
  storyImage,
  caption,
  description,
  likes = '342k',
  comments = '1.2k',
}) => {
  const media = reelImage || storyImage || '';
  const text = caption || description || '';
  const likesLabel = String(likes);
  const commentsLabel = String(comments);

  return (
    <div
      className="w-full max-w-[360px] bg-gray-800 rounded-xl overflow-hidden shadow-lg relative border border-gray-200 font-sans text-white"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Background media */}
      <div className="absolute inset-0 w-full h-full bg-gray-200 flex items-center justify-center">
        {media ? (
          <img src={media} alt="Reel" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-center px-4 text-sm">
            Vídeo Reels<br />(9:16)
          </span>
        )}
      </div>

      {/* Camera icon — top right */}
      <div className="absolute top-4 right-4 z-20">
        <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
          />
        </svg>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10 pointer-events-none" />

      {/* Right action column */}
      <div className="absolute bottom-4 right-2 z-20 flex flex-col items-center gap-5 pb-2">
        {/* Like */}
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78v0z" />
          </svg>
          <span className="text-[12px] font-semibold drop-shadow-md">{likesLabel}</span>
        </div>
        {/* Comment */}
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>
          <span className="text-[12px] font-semibold drop-shadow-md">{commentsLabel}</span>
        </div>
        {/* Share */}
        <div className="flex flex-col items-center gap-1">
          <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          <span className="text-[12px] font-semibold drop-shadow-md">4k</span>
        </div>
        {/* Audio disc */}
        <div className="w-8 h-8 rounded-md bg-gray-800 border-2 border-white/80 mt-2 overflow-hidden flex items-center justify-center">
          {profileImage ? (
            <img src={profileImage} alt="Audio" className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-600" />
          )}
        </div>
      </div>

      {/* Bottom left: avatar + username + caption */}
      <div className="absolute bottom-4 left-3 right-16 z-20 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {profileImage ? (
            <img src={profileImage} alt={username} className="w-8 h-8 rounded-full object-cover border border-white/30" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/30 border border-white/30" />
          )}
          <span className="font-semibold text-[14px] drop-shadow-md">{username}</span>
          <button className="px-2 py-[2px] border border-white rounded-md text-[12px] font-semibold ml-1 bg-transparent">
            Seguir
          </button>
        </div>
        {text ? (
          <p className="text-[14px] leading-tight drop-shadow-md line-clamp-2">{text}</p>
        ) : null}
      </div>
    </div>
  );
};
