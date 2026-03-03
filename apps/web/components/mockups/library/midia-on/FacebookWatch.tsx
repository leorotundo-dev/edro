import React from 'react';

interface FacebookWatchProps {
  thumbnail?: string;
  postImage?: string;
  videoTitle?: string;
  title?: string;
  headline?: string;
  name?: string;
  pageName?: string;
  views?: string;
  duration?: string;
}

export const FacebookWatch: React.FC<FacebookWatchProps> = ({
  thumbnail = '',
  postImage,
  videoTitle = 'Video Title',
  title,
  headline,
  name,
  pageName = 'Page Name',
  views = '1.2M views',
  duration = '5:30',
}) => {
  const resolvedThumbnail = postImage ?? thumbnail;
  const resolvedTitle = title ?? headline ?? name ?? videoTitle;

  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-video bg-gray-900">
        {resolvedThumbnail && <img src={resolvedThumbnail} alt={resolvedTitle} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900 ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
          {duration}
        </div>
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{resolvedTitle}</h3>
        <p className="text-xs text-gray-600">{pageName}</p>
        <p className="text-xs text-gray-500 mt-1">{views}</p>
      </div>
    </div>
  );
};
