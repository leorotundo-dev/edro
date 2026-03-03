import React from 'react';

interface LinkedInAdProps {
  companyName?: string;
  username?: string;
  companyLogo?: string;
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

export const LinkedInAd: React.FC<LinkedInAdProps> = ({
  companyName = 'Company Name',
  username,
  companyLogo = '',
  adImage = '',
  postImage,
  thumbnail,
  headline = 'Grow your business with our solution',
  title,
  name,
  description = 'Learn how industry leaders are achieving results.',
  subtitle,
  ctaText = 'Learn More',
}) => {
  const resolvedCompanyName = username ?? companyName;
  const resolvedAdImage = postImage ?? thumbnail ?? adImage;
  const resolvedHeadline = title ?? name ?? headline;
  const resolvedDescription = subtitle ?? description;

  return (
    <div className="w-full max-w-[552px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden">
          {companyLogo && (
            <img src={companyLogo} alt={resolvedCompanyName} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{resolvedCompanyName}</p>
          <p className="text-xs text-gray-500">Promoted</p>
        </div>
      </div>

      {/* Ad Image */}
      {resolvedAdImage && (
        <div className="w-full">
          <img src={resolvedAdImage} alt="Ad" className="w-full object-cover" />
        </div>
      )}

      {/* Ad Content */}
      <div className="p-4 border-t border-gray-100">
        <h3 className="font-semibold text-base text-gray-900 mb-1">{resolvedHeadline}</h3>
        <p className="text-sm text-gray-600 mb-3">{resolvedDescription}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded text-sm flex items-center justify-center gap-2">
          {ctaText}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </button>
      </div>
    </div>
  );
};
