import React from 'react';

interface GoogleVideoAdProps {
  thumbnail?: string;
  postImage?: string;
  headline?: string;
  title?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  ctaText?: string;
}

export const GoogleVideoAd: React.FC<GoogleVideoAdProps> = ({
  thumbnail = '',
  postImage,
  headline = 'Video Ad Headline',
  title,
  name,
  description = 'Video description text',
  subtitle,
  ctaText = 'Watch Now',
}) => {
  const resolvedThumbnail = postImage ?? thumbnail;
  const resolvedHeadline = title ?? name ?? headline;
  const resolvedDescription = subtitle ?? description;

  return (
    <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="relative w-full aspect-video bg-gray-900">
        {resolvedThumbnail && <img src={resolvedThumbnail} alt="Video" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900 ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad · 0:15</span>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-base text-gray-900 mb-1">{resolvedHeadline}</h4>
        <p className="text-sm text-gray-600 mb-3">{resolvedDescription}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
