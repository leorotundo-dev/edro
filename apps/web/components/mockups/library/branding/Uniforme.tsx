import React from 'react';

interface UniformeProps {
  brandLogo?: string;
  profileImage?: string;
  brandName?: string;
  username?: string;
  brandColor?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
}

export const Uniforme: React.FC<UniformeProps> = ({
  brandLogo = '',
  profileImage,
  brandName = 'Brand Name',
  username,
  brandColor = '#10b981',
  content = 'Brand identity element',
  text,
  body,
  caption,
}) => {
  const resolvedLogo = brandLogo || profileImage;
  const resolvedBrandName = brandName || username;
  const resolvedContent = content || text || body || caption;
  return (
    <div className="relative w-[400px] h-[500px] bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg">
      <div className="h-full flex flex-col items-center justify-center p-6">
        {resolvedLogo && (
          <div className="w-24 h-24 mb-4">
            <img src={resolvedLogo} alt={resolvedBrandName} className="w-full h-full object-contain" />
          </div>
        )}

        <h2 className="text-2xl font-black text-gray-900 mb-2">{resolvedBrandName}</h2>
        <p className="text-sm text-gray-600 text-center">{resolvedContent}</p>

        <div
          className="mt-4 w-full h-2 rounded-full"
          style={{ backgroundColor: brandColor }}
        />
      </div>

      <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
        Uniforme/Vestuário
      </div>

      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
