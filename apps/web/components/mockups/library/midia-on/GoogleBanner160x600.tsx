import React from 'react';

interface GoogleBanner160x600Props {
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
}

export const GoogleBanner160x600: React.FC<GoogleBanner160x600Props> = ({
  adImage = '',
  headline = 'Your Headline',
  description = 'Description text',
  ctaText = 'Learn More',
}) => {
  return (
    <div className="w-[160px] h-[600px] bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col">
      <div className="relative h-[400px] bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad</span>
      </div>
      <div className="flex-1 p-3 flex flex-col">
        <h4 className="font-bold text-xs text-gray-900 mb-2 line-clamp-3">{headline}</h4>
        <p className="text-[10px] text-gray-600 mb-3 line-clamp-4">{description}</p>
        <button className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-xs">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
