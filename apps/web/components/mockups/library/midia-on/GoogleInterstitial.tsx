import React from 'react';
import { X } from 'lucide-react';

interface GoogleInterstitialProps {
  adImage?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
  logo?: string;
}

export const GoogleInterstitial: React.FC<GoogleInterstitialProps> = ({
  adImage = '',
  headline = 'Full Screen Ad Headline',
  description = 'Compelling description for interstitial ad',
  ctaText = 'Continue',
  logo = '',
}) => {
  return (
    <div className="relative w-full max-w-[375px] h-[667px] bg-white shadow-2xl overflow-hidden">
      <button className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center">
        <X className="w-5 h-5 text-white" />
      </button>
      
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gray-200 relative">
          {adImage && <img src={adImage} alt="Ad" className="w-full h-full object-cover" />}
          <span className="absolute top-4 left-4 text-xs text-white bg-black/60 px-2 py-1 rounded">Ad</span>
        </div>
        
        <div className="p-6 text-center">
          {logo && (
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 overflow-hidden mb-4">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <h2 className="font-bold text-2xl text-gray-900 mb-3">{headline}</h2>
          <p className="text-base text-gray-700 mb-6">{description}</p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-base">
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};
