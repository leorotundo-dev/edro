import React from 'react';

interface FacebookReelProps {
  username?: string;
  profileImage?: string;
  reelImage?: string;
  storyImage?: string;
  caption?: string;
  description?: string;
  likes?: string | number;
  comments?: string | number;
  shares?: string | number;
}

export const FacebookReel: React.FC<FacebookReelProps> = ({
  username = 'username',
  profileImage = '',
  reelImage,
  storyImage,
  caption,
  description,
  likes = '342 mil',
  comments = '1,2 mil',
  shares = '4 mil',
}) => {
  const media = reelImage || storyImage || '';
  const text = caption || description || '';
  const likesLabel = String(likes);
  const commentsLabel = String(comments);
  const sharesLabel = String(shares);

  return (
    <div
      className="w-full max-w-[360px] rounded-xl overflow-hidden shadow-lg relative border border-gray-200 font-sans text-white"
      style={{ aspectRatio: '9/16', background: '#18191A' }}
    >
      {/* Background media */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ background: '#18191A' }}>
        {media ? (
          <img src={media} alt="Reel" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-center px-4 text-sm">
            Vídeo Reels<br />(9:16)
          </span>
        )}
      </div>

      {/* Top right — lupa + câmera */}
      <div className="absolute top-4 right-4 z-20 flex gap-4 items-center">
        <svg className="w-6 h-6 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 w-full pointer-events-none z-10" style={{ height: '60%', background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.30) 50%, transparent 100%)' }} />

      {/* Right action column — estilo Facebook (botões circulares) */}
      <div className="absolute bottom-6 right-2 z-20 flex flex-col items-center gap-6 pb-2">
        {/* Curtir */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <svg className="w-5 h-5 fill-white" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM8 13.5l-3.5-3.5 1.5-1.5L8 10.5 14 4.5l1.5 1.5L8 13.5z" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold drop-shadow-md">{likesLabel}</span>
        </div>
        {/* Comentar */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <svg className="w-5 h-5 fill-white" viewBox="0 0 20 20">
              <path d="M10 2C5.6 2 2 5.2 2 9.2c0 2.3 1.2 4.4 3.2 5.7V18l2.9-1.6c1.2.3 2.5.5 3.9.5 4.4 0 8-3.2 8-7.2S14.4 2 10 2zm0 13c-1.1 0-2.2-.2-3.2-.6l-.4-.2-2 .8.6-2-.3-.5C3.5 11.3 2.8 9.9 2.8 8.4c0-3.1 3.2-5.6 7.2-5.6s7.2 2.5 7.2 5.6-3.2 5.6-7.2 5.6z" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold drop-shadow-md">{commentsLabel}</span>
        </div>
        {/* Compartilhar */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.40)', border: '1px solid rgba(255,255,255,0.20)' }}>
            <svg className="w-5 h-5 fill-white" viewBox="0 0 20 20">
              <path d="M16 12l-6-6v4c-5.5 0-8 3.5-9 8 2-2.5 5-3 9-3v4l6-6z" />
            </svg>
          </div>
          <span className="text-[13px] font-semibold drop-shadow-md">{sharesLabel}</span>
        </div>
      </div>

      {/* Bottom left — avatar + username + caption */}
      <div className="absolute bottom-6 left-4 right-16 z-20 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.30)' }}>
            {profileImage ? (
              <img src={profileImage} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/30" />
            )}
          </div>
          <span className="font-semibold text-[15px] drop-shadow-md">{username}</span>
          <button
            className="px-3 py-1 rounded-md text-[13px] font-semibold ml-2 backdrop-blur-sm transition-colors hover:bg-white/20"
            style={{ border: '1px solid rgba(255,255,255,0.80)', background: 'rgba(0,0,0,0.20)' }}
          >
            Seguir
          </button>
        </div>
        {text ? (
          <p className="text-[14px] leading-tight drop-shadow-md line-clamp-2">{text}</p>
        ) : null}
        {/* Áudio */}
        <div className="flex items-center gap-2 mt-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <span className="text-[13px] font-semibold truncate max-w-[140px]">Áudio original</span>
        </div>
      </div>
    </div>
  );
};
