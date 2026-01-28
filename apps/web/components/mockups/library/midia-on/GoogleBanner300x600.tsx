import React from 'react';

interface GoogleBanner300x600Props {
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
}

export const GoogleBanner300x600: React.FC<GoogleBanner300x600Props> = ({
  adImage = '',
  headline = 'Your Headline Here',
  description = 'Detailed description of your product or service',
  ctaText = 'Learn More',
  logo = '',
}) => {
  return (
    <div className="w-[300px] h-[600px] bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      <div className="relative h-[400px] bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad</span>
      </div>
      <div className="flex-1 p-4 flex flex-col">
        {logo && (
          <div className="w-12 h-12 rounded bg-gray-200 overflow-hidden mb-3">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
        )}
        <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-2">{headline}</h3>
        <p className="text-xs text-gray-600 mb-4 line-clamp-4">{description}</p>
        <button className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
