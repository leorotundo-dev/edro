import React from 'react';

interface JornalPaginaInteiraProps {
  headline?: string;
  title?: string;
  name?: string;
  subheadline?: string;
  subtitle?: string;
  description?: string;
  bodyText?: string;
  text?: string;
  body?: string;
  caption?: string;
  content?: string;
  adImage?: string;
  postImage?: string;
  thumbnail?: string;
  image?: string;
}

export const JornalPaginaInteira: React.FC<JornalPaginaInteiraProps> = ({
  headline,
  title,
  name,
  subheadline,
  subtitle,
  description,
  bodyText,
  text,
  body,
  caption,
  content,
  adImage,
  postImage,
  thumbnail,
  image,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Your Headline Here';
  const resolvedSubheadline = subheadline ?? subtitle ?? description ?? 'Subheadline or tagline';
  const resolvedBodyText = bodyText ?? text ?? body ?? caption ?? content ?? 'Ad body text and call to action';
  const resolvedAdImage = adImage ?? postImage ?? thumbnail ?? image ?? '';
  return (
    <div className="relative w-[450px] h-[600px] bg-white border border-gray-400 shadow-md overflow-hidden">
      <div className="absolute inset-0 bg-gray-50 p-3">
        {resolvedAdImage && (
          <div className="w-full h-1/2 bg-gray-200 mb-2">
            <img src={resolvedAdImage} alt="Ad" className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-gray-900 text-xl font-black mb-1 leading-tight">{resolvedHeadline}</h2>
        <h3 className="text-gray-700 text-sm font-bold mb-2">{resolvedSubheadline}</h3>
        <p className="text-gray-600 text-xs leading-relaxed">{resolvedBodyText}</p>
      </div>

      <div className="absolute top-2 right-2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6z"/></svg>
        Jornal Página Inteira
      </div>

      <div className="absolute bottom-2 left-2 bg-white text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
        30x40cm
      </div>
    </div>
  );
};
