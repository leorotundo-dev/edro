import React from 'react';

interface GoogleBanner728x90Props {
  backgroundImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
}

export const GoogleBanner728x90: React.FC<GoogleBanner728x90Props> = ({
  backgroundImage = '',
  headline = 'Your Headline Here',
  description = 'Short description',
  ctaText = 'Learn More',
  logo = '',
}) => {
  return (
    <div className="relative w-[728px] h-[90px] bg-white border border-gray-300 shadow-sm overflow-hidden">
      {backgroundImage && (
        <img src={backgroundImage} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
      )}
      <div className="relative h-full flex items-center justify-between px-4 gap-3">
        {logo && (
          <div className="w-16 h-16 flex-shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-900 line-clamp-1">{headline}</h3>
          <p className="text-xs text-gray-600 line-clamp-1">{description}</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded text-xs whitespace-nowrap">
          {ctaText}
        </button>
      </div>
      <span className="absolute top-1 right-1 text-[8px] text-gray-400 bg-white px-1 rounded">Ad</span>
    </div>
  );
};
