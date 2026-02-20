import React from 'react';

interface LinkedInPostProps {
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
  postImage?: string;
  image?: string;
  likes?: number | string;
  comments?: number | string;
  shares?: number | string;
}

export const LinkedInPost: React.FC<LinkedInPostProps> = ({
  name,
  username,
  headline,
  subheadline,
  subtitle,
  profileImage = '',
  timeAgo = '2 h',
  postText,
  caption,
  description,
  postImage,
  image,
  likes = '1.234',
  comments = 124,
  shares = 45,
}) => {
  const displayName = name || username || 'Nome Profissional';
  const displayHeadline = headline || subheadline || subtitle || 'Cargo · Empresa';
  const text = postText || caption || description || '';
  const media = postImage || image || '';
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
          <div className="flex items-center gap-1">
            <span className="font-semibold text-[14px] hover:text-[#0a66c2] cursor-pointer">{displayName}</span>
            <span className="text-[14px]" style={{ color: '#666666' }}>• 1º</span>
          </div>
          <span className="text-[12px] truncate" style={{ color: 'rgba(0,0,0,0.60)' }}>{displayHeadline}</span>
          <div className="flex items-center text-[12px] gap-1 mt-[2px]" style={{ color: 'rgba(0,0,0,0.60)' }}>
            <span>{timeAgo} • </span>
            {/* Globe icon */}
            <svg className="w-3 h-3 fill-current" viewBox="0 0 16 16">
              <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm2.44 11.24A5.55 5.55 0 018 13.5a5.55 5.55 0 01-2.44-.56C5.8 11.83 6.69 11 8 11s2.2.83 2.44 1.94zM10.84 11a4.23 4.23 0 00-5.68 0A5.53 5.53 0 012.65 8 5.51 5.51 0 018 2.5a5.5 5.5 0 015.35 5.5 5.53 5.53 0 01-2.51 3z" />
              <path d="M8 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100" style={{ color: 'rgba(0,0,0,0.60)' }}>
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M14 12a2 2 0 11-2-2 2 2 0 012 2zM4 10a2 2 0 102 2 2 2 0 00-2-2zm16 0a2 2 0 102 2 2 2 0 00-2-2z" />
          </svg>
        </button>
      </div>

      {/* Caption */}
      {text ? (
        <div className="px-4 pb-2 text-[14px] leading-[1.4]">
          <p className="line-clamp-3">{text}</p>
          <button className="font-semibold mt-1 hover:underline" style={{ color: 'rgba(0,0,0,0.60)' }}>…ver mais</button>
        </div>
      ) : null}

      {/* Mídia */}
      <div className="w-full overflow-hidden" style={{ background: '#f3f2ef' }}>
        {media ? (
          <img src={media} alt="Post" className="w-full h-auto max-h-[600px] object-cover" />
        ) : (
          <div className="w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <span className="text-sm" style={{ color: 'rgba(0,0,0,0.50)' }}>Mídia Estática</span>
          </div>
        )}
      </div>

      {/* Reações */}
      <div
        className="px-4 py-2 border-b mx-2 flex justify-between items-center text-[12px]"
        style={{ borderColor: '#e0dfdc', color: 'rgba(0,0,0,0.60)' }}
      >
        <div className="flex items-center gap-1 cursor-pointer hover:underline">
          <div className="flex -space-x-0.5">
            {/* Like badge */}
            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white" style={{ background: '#0a66c2' }}>
              <svg className="w-[10px] h-[10px] fill-white" viewBox="0 0 16 16">
                <path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" />
              </svg>
            </div>
            {/* Celebrate badge */}
            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white" style={{ background: '#6dae4f' }}>
              <svg className="w-[10px] h-[10px] fill-white" viewBox="0 0 16 16">
                <path d="M8 1l1.8 3.6L14 5.6l-3 2.9.7 4.1L8 10.6l-3.7 1.9.7-4.1-3-2.9 4.2-.9L8 1z" />
              </svg>
            </div>
          </div>
          <span className="ml-1">Você e {likesLabel} outras pessoas</span>
        </div>
        <div className="flex gap-2">
          <span className="cursor-pointer hover:underline">{comments} comentários</span>
          <span>•</span>
          <span className="cursor-pointer hover:underline">{shares} compartilhamentos</span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center justify-between px-2 py-1 font-semibold text-[14px]" style={{ color: 'rgba(0,0,0,0.60)' }}>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md hover:bg-black/5 transition-colors">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.88L8.89 9H4.11A2.12 2.12 0 002 11.11V20a2 2 0 002 2h9.61a5.6 5.6 0 005.11-3.37l2.84-7.1A2 2 0 0019.46 11zM4 20h-2v-9h2zm15.61-9.45l-2.84 7.1a3.6 3.6 0 01-3.28 2.15H6V11.11a.12.12 0 01.11-.11h4.86a1 1 0 00.86-1.48l-1-2.11a7.17 7.17 0 01-.36-2.24V3.74A.75.75 0 0110.76 3a.76.76 0 01.75.75l.49 1.47a9 9 0 002.16 3.52L18.05 11h1.45v-.45z" />
          </svg>
          Gostei
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md hover:bg-black/5 transition-colors">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M7 9h10v1H7zm0 4h7v-1H7zm11-10H6a3 3 0 00-3 3v15l4.5-4.5h10.5a3 3 0 003-3V6a3 3 0 00-3-3zm1 10a1 1 0 01-1 1H7.09L5 15.09V6a1 1 0 011-1h12a1 1 0 011 1z" />
          </svg>
          Comentar
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md hover:bg-black/5 transition-colors">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M23 12l-4.61 5L17 15.63 20.39 12 17 8.37l1.39-1.37L23 12zM10.15 6L8.85 7.37 12 10.33H1.27v2h10.77l-3.15 3.1 1.3 1.37L15 11.33 10.15 6z" />
          </svg>
          Repostar
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-md hover:bg-black/5 transition-colors">
          <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
            <path d="M21 3L0 10l7.66 4.26L16 8l-6.26 8.34L14 24l7-21z" />
          </svg>
          Enviar
        </button>
      </div>
    </div>
  );
};
