import React from 'react';

interface PoliticaHomeOfficeProps {
  coverImage?: string;
  companyLogo?: string;
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  version?: string;
  coverColor?: string;
}

export const PoliticaHomeOffice: React.FC<PoliticaHomeOfficeProps> = ({
  coverImage = '',
  companyLogo = '',
  title,
  headline,
  name,
  subtitle,
  description,
  version = 'v1.0',
  coverColor = '#059669',
}) => {
  const resolvedTitle = title || headline || name || 'Manual Title';
  const resolvedSubtitle = subtitle || description || 'Internal documentation';
  return (
    <div className="relative w-[297px] h-[420px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div
        className="absolute inset-0"
        style={{ backgroundColor: coverColor }}
      >
        {coverImage && <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-30" />}
      </div>

      <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
        {companyLogo && (
          <div className="w-32 h-32 bg-white rounded-lg p-4 mb-6 shadow-lg">
            <img src={companyLogo} alt="Company" className="w-full h-full object-contain" />
          </div>
        )}

        <h1 className="text-3xl font-black text-white mb-3 drop-shadow-lg">{resolvedTitle}</h1>
        <p className="text-lg text-white opacity-90 mb-4 drop-shadow-md">{resolvedSubtitle}</p>

        <div className="mt-auto">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
            {version}
          </span>
        </div>
      </div>

      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
        Política de Home Office
      </div>

      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        A4
      </div>
    </div>
  );
};
