import React from 'react';

interface GoogleInterstitialProps {
  adImage?: string;
  postImage?: string;
  thumbnail?: string;
  headline?: string;
  title?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  ctaText?: string;
  logo?: string;
}

export const GoogleInterstitial: React.FC<GoogleInterstitialProps> = ({
  adImage = '',
  postImage,
  thumbnail,
  headline = 'Full Screen Ad Headline',
  title,
  name,
  description = 'Compelling description for interstitial ad',
  subtitle,
  ctaText = 'Continue',
  logo = '',
}) => {
  const resolvedAdImage = postImage ?? thumbnail ?? adImage;
  const resolvedHeadline = title ?? name ?? headline;
  const resolvedDescription = subtitle ?? description;

  return (
    <div className="relative w-full max-w-[375px] h-[667px] bg-white shadow-2xl overflow-hidden">
      <button className="absolute top-4 right-4 z-10 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>

      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gray-200 relative">
          {resolvedAdImage && <img src={resolvedAdImage} alt="Ad" className="w-full h-full object-cover" />}
          <span className="absolute top-4 left-4 text-xs text-white bg-black/60 px-2 py-1 rounded">Ad</span>
        </div>

        <div className="p-6 text-center">
          {logo && (
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 overflow-hidden mb-4">
              <img src={logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          )}
          <h2 className="font-bold text-2xl text-gray-900 mb-3">{resolvedHeadline}</h2>
          <p className="text-base text-gray-700 mb-6">{resolvedDescription}</p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg text-base">
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  );
};
