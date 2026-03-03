import React from 'react';

interface FacebookAdProps {
  brandName?: string;
  username?: string;
  brandLogo?: string;
  adImage?: string;
  postImage?: string;
  thumbnail?: string;
  headline?: string;
  title?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  ctaText?: string;
}

export const FacebookAd: React.FC<FacebookAdProps> = ({
  brandName = 'Brand Name',
  username,
  brandLogo = '',
  adImage = '',
  postImage,
  thumbnail,
  headline = 'Your headline goes here',
  title,
  name,
  description = 'Description text that explains your offer or product.',
  subtitle,
  ctaText = 'Learn More',
}) => {
  const resolvedBrandName = username ?? brandName;
  const resolvedAdImage = postImage ?? thumbnail ?? adImage;
  const resolvedHeadline = title ?? name ?? headline;
  const resolvedDescription = subtitle ?? description;

  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {brandLogo && (
              <img src={brandLogo} alt={resolvedBrandName} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{resolvedBrandName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Ad Image */}
      {resolvedAdImage && (
        <div className="w-full">
          <img src={resolvedAdImage} alt="Ad" className="w-full object-cover" />
        </div>
      )}

      {/* Ad Content */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h3 className="font-semibold text-base text-gray-900 mb-1">{resolvedHeadline}</h3>
        <p className="text-sm text-gray-600 mb-3">{resolvedDescription}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-sm flex items-center justify-center gap-2">
          {ctaText}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>
  );
};
