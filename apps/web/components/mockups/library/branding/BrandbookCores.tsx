import React from 'react';

interface BrandbookCoresProps {
  brandLogo?: string;
  profileImage?: string;
  brandName?: string;
  username?: string;
  title?: string;
  headline?: string;
  name?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
  brandColor?: string;
}

export const BrandbookCores: React.FC<BrandbookCoresProps> = ({
  brandLogo = '',
  profileImage,
  brandName = 'Brand Name',
  username,
  title = 'Section Title',
  headline,
  name,
  content = 'Brand guidelines and specifications',
  text,
  body,
  caption,
  brandColor = '#2563eb',
}) => {
  const resolvedLogo = brandLogo || profileImage;
  const resolvedBrandName = brandName || username;
  const resolvedTitle = title || headline || name;
  const resolvedContent = content || text || body || caption;
  return (
    <div className="relative w-[297px] h-[420px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div
        className="h-24 flex items-center justify-between px-6"
        style={{ backgroundColor: brandColor }}
      >
        {resolvedLogo && (
          <div className="w-16 h-16 bg-white rounded p-2">
            <img src={resolvedLogo} alt={resolvedBrandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h3 className="text-white font-bold text-lg">{resolvedBrandName}</h3>
      </div>

      <div className="p-6">
        <h1 className="text-3xl font-black text-gray-900 mb-4">{resolvedTitle}</h1>
        <p className="text-base text-gray-700 leading-relaxed">{resolvedContent}</p>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>

      <div className="absolute top-3 right-3 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
        Brandbook - Cores
      </div>

      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        A4
      </div>
    </div>
  );
};
