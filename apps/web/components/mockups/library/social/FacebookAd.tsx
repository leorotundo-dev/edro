import React from 'react';
import { ExternalLink } from 'lucide-react';

interface FacebookAdProps {
  brandName?: string;
  brandLogo?: string;
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
}

export const FacebookAd: React.FC<FacebookAdProps> = ({
  brandName = 'Brand Name',
  brandLogo = '',
  adImage = '',
  headline = 'Your headline goes here',
  description = 'Description text that explains your offer or product.',
  ctaText = 'Learn More',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {brandLogo && (
              <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" />
            )}
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">{brandName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Ad Image */}
      {adImage && (
        <div className="w-full">
          <img src={adImage} alt="Ad" className="w-full object-cover" />
        </div>
      )}

      {/* Ad Content */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <h3 className="font-semibold text-base text-gray-900 mb-1">{headline}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md text-sm flex items-center justify-center gap-2">
          {ctaText}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
