import React from 'react';

interface TVPromocionalProps {
  thumbnail?: string;
  postImage?: string;
  image?: string;
  backgroundImage?: string;
  brandLogo?: string;
  tagline?: string;
  title?: string;
  headline?: string;
  name?: string;
}

export const TVPromocional: React.FC<TVPromocionalProps> = ({
  thumbnail,
  postImage,
  image,
  backgroundImage,
  brandLogo = '',
  tagline,
  title,
  headline,
  name,
}) => {
  const resolvedThumbnail = thumbnail ?? postImage ?? image ?? backgroundImage ?? '';
  const resolvedTagline = tagline ?? title ?? headline ?? name ?? 'Your Brand Message';
  return (
    <div className="relative w-full max-w-[640px] aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gray-900">
        {resolvedThumbnail && <img src={resolvedThumbnail} alt="Commercial" className="w-full h-full object-cover" />}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
        {brandLogo && (
          <div className="w-32 h-16 mb-2">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
          </div>
        )}
        <p className="text-white text-lg font-bold text-center px-4">{resolvedTagline}</p>
      </div>

      <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
        15"
      </div>

      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span>TV Promocional</span>
      </div>
    </div>
  );
};
