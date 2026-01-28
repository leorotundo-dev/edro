import React from 'react';
import { ExternalLink } from 'lucide-react';

interface TwitterAdProps {
  brandName?: string;
  handle?: string;
  brandLogo?: string;
  adText?: string;
  adImage?: string;
  ctaText?: string;
}

export const TwitterAd: React.FC<TwitterAdProps> = ({
  brandName = 'Brand Name',
  handle = '@brandname',
  brandLogo = '',
  adText = 'Discover our latest product. Limited time offer!',
  adImage = '',
  ctaText = 'Learn more',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border-b border-gray-200 p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {brandLogo && <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-gray-900">{brandName}</span>
            <span className="text-sm text-gray-500">{handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Promoted</span>
          </div>
          <p className="text-sm text-gray-900 mt-1">{adText}</p>
          {adImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <img src={adImage} alt="Ad" className="w-full object-cover" />
            </div>
          )}
          <button className="mt-3 w-full bg-black hover:bg-gray-800 text-white font-semibold py-2 px-4 rounded-full text-sm flex items-center justify-center gap-2">
            {ctaText}
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
