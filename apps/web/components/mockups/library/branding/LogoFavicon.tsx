import React from 'react';

interface LogoFaviconProps {
  logoImage?: string;
  profileImage?: string;
  brandLogo?: string;
  brandName?: string;
  backgroundColor?: string;
  showGrid?: boolean;
}

export const LogoFavicon: React.FC<LogoFaviconProps> = ({
  logoImage = '',
  profileImage,
  brandLogo,
  brandName = 'Brand Name',
  backgroundColor = '#ffffff',
  showGrid = false,
}) => {
  const resolvedLogo = logoImage || profileImage || brandLogo;
  return (
    <div
      className="relative w-[160px] h-[160px] rounded-lg overflow-hidden shadow-xl border-2 border-gray-200"
      style={{ backgroundColor }}
    >
      {showGrid && (
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      )}

      <div className="relative h-full flex items-center justify-center p-8">
        {resolvedLogo ? (
          <img src={resolvedLogo} alt={brandName} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-5xl font-black text-white">{brandName.charAt(0)}</span>
            </div>
            <h2 className="text-3xl font-black text-gray-900">{brandName}</h2>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
        Favicon
      </div>

      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        16x16px
      </div>
    </div>
  );
};
