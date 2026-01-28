import React from 'react';

interface GoogleDisplayAdProps {
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
}

export const GoogleDisplayAd: React.FC<GoogleDisplayAdProps> = ({
  adImage = '',
  headline = 'Your Ad Headline',
  description = 'Short description',
  ctaText = 'Learn More',
  logo = '',
}) => {
  return (
    <div className="w-[300px] bg-white border border-gray-300 rounded shadow-sm overflow-hidden">
      <div className="relative w-full h-[250px] bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad</span>
      </div>
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          {logo && (
            <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden flex-shrink-0">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900 line-clamp-2">{headline}</h4>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
          </div>
        </div>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
