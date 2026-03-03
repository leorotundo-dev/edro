import React from 'react';

interface RevistaCapaProps {
  coverImage?: string;
  postImage?: string;
  thumbnail?: string;
  image?: string;
  headline?: string;
  title?: string;
  name?: string;
  subheadline?: string;
  subtitle?: string;
  description?: string;
  brandLogo?: string;
}

export const RevistaCapa: React.FC<RevistaCapaProps> = ({
  coverImage,
  postImage,
  thumbnail,
  image,
  headline,
  title,
  name,
  subheadline,
  subtitle,
  description,
  brandLogo = '',
}) => {
  const resolvedCoverImage = coverImage ?? postImage ?? thumbnail ?? image ?? '';
  const resolvedHeadline = headline ?? title ?? name ?? 'Your Headline';
  const resolvedSubheadline = subheadline ?? subtitle ?? description ?? 'Subheadline or description';
  return (
    <div className="relative w-[315px] h-[420px] bg-white border border-gray-300 shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-gray-100">
        {resolvedCoverImage && <img src={resolvedCoverImage} alt="Magazine" className="w-full h-full object-cover" />}
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {brandLogo && (
          <div className="w-20 h-20 mb-3">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
          </div>
        )}
        <h3 className="text-gray-900 text-lg font-bold text-center mb-2">{resolvedHeadline}</h3>
        <p className="text-gray-700 text-sm text-center">{resolvedSubheadline}</p>
      </div>

      <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        Revista Capa
      </div>

      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded">
        21x28cm
      </div>
    </div>
  );
};
