import React, { useState } from 'react';

interface LinkedInDocumentProps {
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
  slides?: string[];
  likes?: number | string;
  comments?: number | string;
  totalPages?: number;
}

export const LinkedInDocument: React.FC<LinkedInDocumentProps> = ({
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
  slides,
  likes = 892,
  comments = 45,
  totalPages,
}) => {
  const [currentPage, setCurrentPage] = useState(0);

  const displayName = name || username || 'Nome Profissional';
  const displayHeadline = headline || subheadline || subtitle || 'Cargo · Empresa';
  const text = postText || caption || description || '';
  const allSlides = slides && slides.length > 0 ? slides : [postImage || image || ''];
  const total = totalPages || allSlides.length;
  const currentMedia = allSlides[currentPage] || '';

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
          <span className="text-[12px]" style={{ color: 'rgba(0,0,0,0.60)' }}>{timeAgo} • Editado</span>
        </div>
      </div>

      {/* Caption */}
      {text ? (
        <div className="px-4 pb-2 text-[14px] leading-[1.4]">
          <p className="line-clamp-3">{text}</p>
        </div>
      ) : null}

      {/* Document viewer */}
      <div className="w-full relative overflow-hidden border-t border-b" style={{ background: '#f3f2ef', borderColor: '#e0dfdc' }}>
        {currentMedia ? (
          <img src={currentMedia} alt={`Slide ${currentPage + 1}`} className="w-full h-auto max-h-[600px] object-cover" />
        ) : (
          <div className="w-full flex items-center justify-center" style={{ aspectRatio: '4/5' }}>
            <span className="text-sm" style={{ color: 'rgba(0,0,0,0.50)' }}>Capa do Material</span>
          </div>
        )}

        {/* Navigation bar */}
        <div
          className="absolute bottom-3 left-1/2 flex items-center gap-4 rounded-full px-4 py-1.5 backdrop-blur-sm z-10"
          style={{ transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.70)' }}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            style={{ opacity: currentPage === 0 ? 0.4 : 1, cursor: currentPage === 0 ? 'not-allowed' : 'pointer' }}
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M15 4l-8 8 8 8z" /></svg>
          </button>
          <span className="text-[13px] font-semibold text-white">{currentPage + 1} de {total}</span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(total - 1, p + 1))}
            style={{ opacity: currentPage >= total - 1 ? 0.4 : 1, cursor: currentPage >= total - 1 ? 'not-allowed' : 'pointer' }}
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M9 4l8 8-8 8z" /></svg>
          </button>
          <button className="hover:opacity-80 ml-2 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.30)' }}>
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M21 3v6h-2V5h-4V3h6zm-2 16h-4v2h6v-6h-2v4zM5 19h4v2H3v-6h2v4zM3 9h2V5h4V3H3v6z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Footer de reações */}
      <div className="px-4 py-3 flex items-center gap-1 text-[13px] border-t" style={{ borderColor: '#e0dfdc', color: 'rgba(0,0,0,0.60)' }}>
        <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center border border-white" style={{ background: '#0a66c2' }}>
          <svg className="w-[10px] h-[10px] fill-white" viewBox="0 0 16 16">
            <path d="M5.5 6v9.5H2V6h3.5zm10 2.5c0 .8-.5 1.5-1.2 1.8.6.2 1 .8 1 1.5 0 .6-.3 1.1-.8 1.4.4.2.7.7.7 1.3 0 1.1-.9 2-2 2H8.5c-1.1 0-2-.9-2-2V7.5c0-.8.5-1.5 1.2-1.8C8 5.2 8.5 4 8.5 2.5c0-1.1.9-2 2-2s2 .9 2 2c0 1.2-.5 2.3-1.3 3h2.8c1.1 0 2 .9 2 2z" />
          </svg>
        </div>
        <span className="ml-1">{likes} curtidas • {comments} comentários</span>
      </div>
    </div>
  );
};
