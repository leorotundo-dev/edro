import React from 'react';

interface TwitterAdProps {
  brandName?: string;
  username?: string;
  handle?: string;
  brandLogo?: string;
  adText?: string;
  content?: string;
  text?: string;
  body?: string;
  adImage?: string;
  postImage?: string;
  thumbnail?: string;
  ctaText?: string;
}

export const TwitterAd: React.FC<TwitterAdProps> = ({
  brandName = 'Brand Name',
  username,
  handle = '@brandname',
  brandLogo = '',
  adText = 'Discover our latest product. Limited time offer!',
  content,
  text,
  body,
  adImage = '',
  postImage,
  thumbnail,
  ctaText = 'Learn more',
}) => {
  const resolvedBrandName = username ?? brandName;
  const resolvedAdText = content ?? text ?? body ?? adText;
  const resolvedAdImage = postImage ?? thumbnail ?? adImage;

  return (
    <div className="w-full max-w-[600px] bg-white border-b border-gray-200 p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {brandLogo && <img src={brandLogo} alt={resolvedBrandName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-gray-900">{resolvedBrandName}</span>
            <span className="text-sm text-gray-500">{handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Promoted</span>
          </div>
          <p className="text-sm text-gray-900 mt-1">{resolvedAdText}</p>
          {resolvedAdImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <img src={resolvedAdImage} alt="Ad" className="w-full object-cover" />
            </div>
          )}
          <button className="mt-3 w-full bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-full text-sm flex items-center justify-center gap-2">
            {ctaText}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};
