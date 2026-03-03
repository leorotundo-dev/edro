import React from 'react';

interface EstandeLBannerProps {
  brandLogo?: string;
  brandName?: string;
  name?: string;
  username?: string;
  tagline?: string;
  subtitle?: string;
  description?: string;
  backgroundImage?: string;
  postImage?: string;
  thumbnail?: string;
  accentColor?: string;
}

export const EstandeLBanner: React.FC<EstandeLBannerProps> = ({
  brandLogo = '',
  brandName,
  name,
  username,
  tagline,
  subtitle,
  description,
  backgroundImage,
  postImage,
  thumbnail,
  accentColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName ?? name ?? username ?? 'Brand Name';
  const resolvedTagline = tagline ?? subtitle ?? description ?? 'Your tagline here';
  const resolvedBackgroundImage = backgroundImage ?? postImage ?? thumbnail ?? '';
  return (
    <div className="relative w-[180px] h-[480px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div className="absolute inset-0 bg-gray-100">
        {resolvedBackgroundImage && <img src={resolvedBackgroundImage} alt="Booth" className="w-full h-full object-cover opacity-30" />}
      </div>

      <div className="relative h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-32 h-32 mb-4">
            <img src={brandLogo} alt={resolvedBrandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">{resolvedBrandName}</h2>
        <p className="text-base text-gray-700 text-center">{resolvedTagline}</p>

        <div
          className="absolute bottom-0 left-0 right-0 h-2"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        L-Banner
      </div>

      <div className="absolute bottom-3 left-3 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded">
        0.6x1.6m
      </div>
    </div>
  );
};
