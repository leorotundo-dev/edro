import React from 'react';

interface LinkedInVideoProps {
  name?: string;
  username?: string;
  headline?: string;
  subheadline?: string;
  subtitle?: string;
  profileImage?: string;
  timeAgo?: string;
  postText?: string;
  caption?: string;
  description?: string;
  thumbnail?: string;
  videoThumbnail?: string;
  coverImage?: string;
  postImage?: string;
  image?: string;
  likes?: number | string;
  comments?: number | string;
  duration?: string;
}

export const LinkedInVideo: React.FC<LinkedInVideoProps> = ({
  name,
  username,
  headline,
  subheadline,
  subtitle,
  profileImage = '',
  timeAgo = 'Ontem',
  postText,
  caption,
  description,
  thumbnail,
  videoThumbnail,
  coverImage,
  postImage,
  image,
  likes = '2,4 mil',
  comments = 84,
  duration = '3:45',
}) => {
  const displayName = name || username || 'Nome Profissional';
  const displayHeadline = headline || subheadline || subtitle || 'Cargo · Empresa';
  const text = postText || caption || description || '';
  const media = thumbnail || videoThumbnail || coverImage || postImage || image || '';
  const likesLabel = String(likes);

  return (
    <div
      className="w-full max-w-[552px] bg-white rounded-lg border shadow-sm overflow-hidden font-sans"
      style={{ borderColor: '#e0dfdc', color: 'rgba(0,0,0,0.9)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 px-4 pt-4 pb-2">
        <div className="w-12 h-12 rounded-full overflow-hidden border flex-shrink-0" style={{ borderColor: '#e0dfdc' }}>
          {profileImage ? (
            <img src={profileImage} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
        </div>
        <div className="flex-1 flex flex-col leading-tight min-w-0">
          <span className="font-semibold text-[14px] hover:text-[#0a66c2] cursor-pointer">{displayName}</span>
          <span className="text-[12px] truncate" style={{ color: 'rgba(0,0,0,0.60)' }}>{displayHeadline}</span>
          <span className="text-[12px]" style={{ color: 'rgba(0,0,0,0.60)' }}>{timeAgo}</span>
        </div>
      </div>

      {/* Caption */}
      {text ? (
        <div className="px-4 pb-2 text-[14px] leading-[1.4]">
          <p>{text}</p>
        </div>
      ) : null}

      {/* Video player */}
      <div className="w-full relative bg-black flex justify-center items-center overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {media ? (
          <img src={media} alt="Thumbnail" className="w-full h-full object-cover opacity-80" />
        ) : (
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.50)' }}>Thumbnail do Vídeo</span>
        )}

        {/* Play button */}
        <button
          className="absolute inset-0 m-auto rounded-full flex items-center justify-center border-2 border-white hover:bg-[#0a66c2]/80 transition-colors z-10"
          style={{ width: 64, height: 64, background: 'rgba(0,0,0,0.60)' }}
        >
          <svg className="w-8 h-8 fill-white" style={{ marginLeft: 4 }} viewBox="0 0 24 24">
            <path d="M7 4l14 8-14 8z" />
          </svg>
        </button>

        {/* Progress bar */}
        <div className="absolute bottom-0 w-full px-3 py-2 flex items-center gap-3" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80), transparent)' }}>
          <div className="flex-1 h-1 rounded-full relative" style={{ background: 'rgba(255,255,255,0.30)' }}>
            <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: '35%', background: '#0a66c2' }} />
            <div className="absolute top-1/2 rounded-full shadow-md" style={{ left: '35%', transform: 'translate(-50%, -50%)', width: 12, height: 12, background: '#fff' }} />
          </div>
          <span className="text-white text-[12px] font-semibold">1:24 / {duration}</span>
          <button className="text-white hover:opacity-80">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M15 21l-6-5H4V8h5l6-5v18z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reações */}
      <div className="px-4 py-3 flex items-center gap-1 text-[13px] border-t" style={{ borderColor: '#e0dfdc', color: 'rgba(0,0,0,0.60)' }}>
        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white" style={{ background: '#0a66c2' }}>
          <svg className="w-[10px] h-[10px] fill-white" viewBox="0 0 16 16">
            <path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" />
          </svg>
        </div>
        <span className="ml-1">{likesLabel} curtidas • {comments} comentários</span>
      </div>
    </div>
  );
};
