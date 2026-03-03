import React from 'react';

interface InstagramAdProps {
  brandName?: string;
  username?: string;
  brandLogo?: string;
  adImage?: string;
  postImage?: string;
  thumbnail?: string;
  headline?: string;
  title?: string;
  name?: string;
  ctaText?: string;
}

export const InstagramAd: React.FC<InstagramAdProps> = ({
  brandName = 'Brand Name',
  username,
  brandLogo = '',
  adImage = '',
  postImage,
  thumbnail,
  headline = 'Discover our latest collection',
  title,
  name,
  ctaText = 'Shop Now',
}) => {
  const resolvedBrandName = username ?? brandName;
  const resolvedAdImage = postImage ?? thumbnail ?? adImage;
  const resolvedHeadline = title ?? name ?? headline;

  return (
    <div className="w-full max-w-[470px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            {brandLogo && <img src={brandLogo} alt={resolvedBrandName} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{resolvedBrandName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
      </div>

      <div className="w-full aspect-square bg-gray-200">
        {resolvedAdImage && <img src={resolvedAdImage} alt="Ad" className="w-full h-full object-cover" />}
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm mb-2">{resolvedHeadline}</p>
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md text-sm flex items-center justify-center gap-2">
          {ctaText}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>
  );
};
