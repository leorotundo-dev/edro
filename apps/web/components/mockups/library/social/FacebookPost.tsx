import React from 'react';

interface FacebookPostProps {
  username?: string;
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

export const FacebookPost: React.FC<FacebookPostProps> = ({
  username = 'Username',
  profileImage = '',
  timeAgo = '2 h',
  postText,
  caption,
  description,
  postImage,
  image,
  likes = '3,4 mil',
  comments = 124,
  shares = 45,
}) => {
  const text = postText || caption || description || '';
  const media = postImage || image || '';
  const likesLabel = String(likes);
  const commentsLabel = `${comments} comentários`;
  const sharesLabel = `${shares} compartilhamentos`;

  return (
    <div
      className="w-full max-w-[500px] bg-white shadow-md rounded-xl overflow-hidden border border-gray-200 font-sans"
      style={{ color: '#050505' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
            {profileImage ? (
              <img src={profileImage} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-semibold text-[15px]">{username}</span>
            <div className="flex items-center text-[13px] gap-1 mt-[2px]" style={{ color: '#65676B' }}>
              <span>{timeAgo}</span>
              <span aria-hidden="true">·</span>
              {/* Globe / público */}
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.982 4.956c-.23-.847-.565-1.635-.98-2.336A1.91 1.91 0 0 1 11.982 4.956zM8 1.543c1.077 0 2.052.261 2.872.71a17.218 17.218 0 0 0-1.745 2.703H6.873a17.218 17.218 0 0 0-1.745-2.703 6.455 6.455 0 0 1 2.872-.71zM4.018 4.956a1.91 1.91 0 0 1 .98-2.336 15.655 15.655 0 0 0-.98 2.336zM1.543 8c0-.981.22-1.908.614-2.74h2.515a18.253 18.253 0 0 0 0 5.48H2.157A6.47 6.47 0 0 1 1.543 8zm1.09 3.284a15.655 15.655 0 0 0 .98 2.336 1.91 1.91 0 0 1-.98-2.336zm4.24 3.173a17.218 17.218 0 0 0 1.745-2.703h2.254a17.218 17.218 0 0 0 1.745 2.703 6.455 6.455 0 0 1-5.744 0zm5.127-.837a15.655 15.655 0 0 0 .98-2.336 1.91 1.91 0 0 1-.98 2.336zm1.386-3.173h-2.515a18.253 18.253 0 0 0 0-5.48h2.515A6.47 6.47 0 0 1 14.457 8c0 .981-.22 1.908-.614 2.74zM8 11.258a16.635 16.635 0 0 1-1.99-3.258h3.98c-.46 1.252-1.127 2.366-1.99 3.258z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex gap-1" style={{ color: '#65676B' }}>
          <button className="hover:bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M10 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
            </svg>
          </button>
          <button className="hover:bg-gray-100 p-2 rounded-full">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
              <path d="M15.41 6.59L10.83 2l-.59.59L14.83 7H2v2h12.83l-4.59 4.41.59.59L15.41 8.41a2.003 2.003 0 0 0 0-1.82z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Caption — acima da imagem no Facebook */}
      {text ? (
        <div className="px-4 pb-3 text-[15px] leading-[1.33]">{text}</div>
      ) : null}

      {/* Mídia */}
      <div className="w-full overflow-hidden" style={{ background: '#F0F2F5' }}>
        {media ? (
          <img src={media} alt="Post" className="w-full h-auto max-h-[600px] object-cover" />
        ) : (
          <div className="w-full flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
            <span className="text-sm" style={{ color: '#65676B' }}>Sem Mídia</span>
          </div>
        )}
      </div>

      {/* Reações e contadores */}
      <div
        className="flex items-center justify-between px-4 py-[10px] text-[13px] border-b mx-1"
        style={{ color: '#65676B', borderColor: '#CED0D4' }}
      >
        <div className="flex items-center gap-1 cursor-pointer hover:underline">
          <div className="flex -space-x-1">
            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white z-10" style={{ background: '#1877F2' }}>
              <svg className="w-3 h-3 fill-white" viewBox="0 0 16 16">
                <path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" />
              </svg>
            </div>
            <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white" style={{ background: '#F33E58' }}>
              <svg className="w-3 h-3 fill-white" viewBox="0 0 16 16">
                <path d="M8 15.5l-1.4-1.3C3.2 11.2 1 9.2 1 6.5 1 4 3 2 5.5 2c1.4 0 2.8.7 3.5 1.8C9.7 2.7 11.1 2 12.5 2 15 2 17 4 17 6.5c0 2.7-2.2 4.7-5.6 7.7L8 15.5z" />
              </svg>
            </div>
          </div>
          <span>{likesLabel}</span>
        </div>
        <div className="flex gap-3">
          <span className="cursor-pointer hover:underline">{commentsLabel}</span>
          <span className="cursor-pointer hover:underline">{sharesLabel}</span>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center justify-between px-3 py-1 font-semibold text-[15px]" style={{ color: '#65676B' }}>
        <button className="flex-1 flex items-center justify-center gap-2 py-[6px] rounded-md hover:bg-[#F2F2F2] transition-colors">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM8 13.5l-3.5-3.5 1.5-1.5L8 10.5 14 4.5l1.5 1.5L8 13.5z" />
          </svg>
          Curtir
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-[6px] rounded-md hover:bg-[#F2F2F2] transition-colors">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M10 2C5.6 2 2 5.2 2 9.2c0 2.3 1.2 4.4 3.2 5.7V18l2.9-1.6c1.2.3 2.5.5 3.9.5 4.4 0 8-3.2 8-7.2S14.4 2 10 2zm0 13c-1.1 0-2.2-.2-3.2-.6l-.4-.2-2 .8.6-2-.3-.5C3.5 11.3 2.8 9.9 2.8 8.4c0-3.1 3.2-5.6 7.2-5.6s7.2 2.5 7.2 5.6-3.2 5.6-7.2 5.6z" />
          </svg>
          Comentar
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-[6px] rounded-md hover:bg-[#F2F2F2] transition-colors">
          <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
            <path d="M16 12l-6-6v4c-5.5 0-8 3.5-9 8 2-2.5 5-3 9-3v4l6-6z" />
          </svg>
          Compartilhar
        </button>
      </div>
    </div>
  );
};
