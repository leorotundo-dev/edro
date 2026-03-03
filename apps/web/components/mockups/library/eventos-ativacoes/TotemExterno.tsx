import React from 'react';

interface TotemExternoProps {
  brandName?: string;
  name?: string;
  username?: string;
  brandLogo?: string;
  tagline?: string;
  subtitle?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const TotemExterno: React.FC<TotemExternoProps> = ({
  brandName,
  name,
  username,
  brandLogo = '',
  tagline,
  subtitle,
  description,
  backgroundColor = '#1f2937',
  textColor = '#ffffff',
}) => {
  const resolvedBrandName = brandName ?? name ?? username ?? 'Brand Name';
  const resolvedTagline = tagline ?? subtitle ?? description ?? 'Your tagline here';
  return (
    <div
      className="relative w-[300px] h-[600px] rounded-lg overflow-hidden shadow-2xl border-4"
      style={{ backgroundColor, borderColor: '#374151' }}
    >
      <div className="h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-32 h-32 mb-4">
            <img src={brandLogo} alt={resolvedBrandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h2
          className="text-3xl font-black text-center mb-2"
          style={{ color: textColor }}
        >
          {resolvedBrandName}
        </h2>
        <p
          className="text-base text-center"
          style={{ color: textColor, opacity: 0.9 }}
        >
          {resolvedTagline}
        </p>
      </div>

      <div className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        Totem Externo
      </div>

      <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
