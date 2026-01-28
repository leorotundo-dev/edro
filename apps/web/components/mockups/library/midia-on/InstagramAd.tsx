import React from 'react';
import { ExternalLink } from 'lucide-react';

interface InstagramAdProps {
  brandName?: string;
  brandLogo?: string;
  adImage?: string;
  headline?: string;
  ctaText?: string;
}

export const InstagramAd: React.FC<InstagramAdProps> = ({
  brandName = 'Brand Name',
  brandLogo = '',
  adImage = '',
  headline = 'Discover our latest collection',
  ctaText = 'Shop Now',
}) => {
  return (
    <div className="w-full max-w-[470px] bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center justify-between p-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
            {brandLogo && <img src={brandLogo} alt={brandName} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="font-semibold text-sm">{brandName}</p>
            <p className="text-xs text-gray-500">Sponsored</p>
          </div>
        </div>
      </div>

      <div className="w-full aspect-square bg-gray-200">
        {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
      </div>

      <div className="p-3">
        <p className="font-semibold text-sm mb-2">{headline}</p>
        <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-md text-sm flex items-center justify-center gap-2">
          {ctaText}
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
