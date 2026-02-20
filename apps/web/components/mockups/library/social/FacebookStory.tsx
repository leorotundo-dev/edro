import React from 'react';

interface FacebookStoryProps {
  username?: string;
  profileImage?: string;
  storyImage?: string;
  timeAgo?: string;
}

export const FacebookStory: React.FC<FacebookStoryProps> = ({
  username = 'Username',
  profileImage = '',
  storyImage = '',
  timeAgo = '2 h',
}) => {
  return (
    <div
      className="w-full max-w-[360px] bg-gray-900 rounded-xl overflow-hidden shadow-lg relative border border-gray-200 font-sans text-white"
      style={{ aspectRatio: '9/16' }}
    >
      {/* Background media */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ background: '#18191A' }}>
        {storyImage ? (
          <img src={storyImage} alt="Story" className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-500 text-sm">Mídia Vertical</span>
        )}
      </div>

      {/* Top gradient */}
      <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none" />

      {/* Header — estilo Facebook (anel azul, botões direita) */}
      <div className="absolute top-0 w-full z-20 px-4 pt-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* Anel azul Facebook */}
          <div className="rounded-full p-[2px] flex-shrink-0" style={{ background: '#1877F2' }}>
            <div className="rounded-full overflow-hidden border-2 border-black/20" style={{ width: 40, height: 40 }}>
              {profileImage ? (
                <img src={profileImage} alt={username} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-400" />
              )}
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[15px] drop-shadow-md">{username}</span>
            <span className="text-[13px] drop-shadow-md" style={{ color: 'rgba(255,255,255,0.8)' }}>{timeAgo}</span>
          </div>
        </div>
        <div className="flex gap-4 items-center">
          <button>
            <svg className="w-6 h-6 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="2" /><circle cx="5" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          <button>
            <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 w-full h-28 bg-gradient-to-t from-black/70 to-transparent z-10 pointer-events-none" />

      {/* Footer — "Responder" + thumbs up */}
      <div className="absolute bottom-0 w-full z-20 px-4 pb-4 flex items-center gap-3">
        <div
          className="flex-1 h-12 rounded-full flex items-center px-4 backdrop-blur-sm"
          style={{ border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.20)' }}
        >
          <span className="text-[15px]" style={{ color: 'rgba(255,255,255,0.9)' }}>Responder...</span>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/10">
          <svg className="w-7 h-7 drop-shadow-md" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};
