import React from 'react';

interface GoogleResponsiveAdProps {
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
  displayUrl?: string;
}

export const GoogleResponsiveAd: React.FC<GoogleResponsiveAdProps> = ({
  adImage = '',
  headline = 'Responsive Ad Headline',
  description = 'Ad description that adapts to different sizes',
  ctaText = 'Learn More',
  logo = '',
  displayUrl = 'www.example.com',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full aspect-video bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {logo && (
            <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <span className="text-xs text-green-700">{displayUrl}</span>
        </div>
        <h3 className="font-bold text-base text-gray-900 mb-1 line-clamp-2">{headline}</h3>
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">{description}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
