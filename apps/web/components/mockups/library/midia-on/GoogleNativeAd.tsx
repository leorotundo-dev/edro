import React from 'react';

interface GoogleNativeAdProps {
  adImage?: string;
  headline?: string;
  description?: string;
  sponsoredBy?: string;
  logo?: string;
}

export const GoogleNativeAd: React.FC<GoogleNativeAdProps> = ({
  adImage = '',
  headline = 'Native Ad Headline That Blends With Content',
  description = 'Native ad description that looks like editorial content',
  sponsoredBy = 'Brand Name',
  logo = '',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex gap-4 p-4">
        <div className="w-32 h-32 flex-shrink-0 bg-gray-200 rounded overflow-hidden">
          {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {logo && (
              <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden">
                <img src={logo} alt="Logo" className="w-full h-full object-cover" />
              </div>
            )}
            <span className="text-xs text-gray-500">Sponsored by {sponsoredBy}</span>
          </div>
          <h3 className="font-semibold text-base text-gray-900 mb-1 line-clamp-2">{headline}</h3>
          <p className="text-sm text-gray-600 line-clamp-3">{description}</p>
        </div>
      </div>
    </div>
  );
};
