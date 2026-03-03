import React from 'react';

interface PitchProdutoProps {
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
  logo?: string;
  backgroundImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  accentColor?: string;
}

export const PitchProduto: React.FC<PitchProdutoProps> = ({
  title,
  headline,
  name,
  subtitle,
  description,
  content,
  text,
  body,
  caption,
  logo = '',
  backgroundImage,
  image,
  postImage,
  thumbnail,
  accentColor = '#f59e0b',
}) => {
  const resolvedTitle = title ?? headline ?? name ?? 'Slide Title';
  const resolvedSubtitle = subtitle ?? description ?? 'Subtitle or description';
  const resolvedContent = content ?? text ?? body ?? caption ?? 'Main content goes here';
  const resolvedBackgroundImage = backgroundImage ?? image ?? postImage ?? thumbnail ?? '';

  return (
    <div className="relative w-full max-w-[800px] aspect-video bg-white rounded-lg overflow-hidden shadow-2xl border-2 border-gray-200">
      <div className="absolute inset-0">
        {resolvedBackgroundImage && <img src={resolvedBackgroundImage} alt="Background" className="w-full h-full object-cover opacity-10" />}
      </div>

      <div className="relative h-full flex flex-col p-12">
        <div className="flex items-center justify-between mb-auto">
          {logo && (
            <div className="w-16 h-16">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          )}
          <div
            className="w-12 h-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-5xl font-black text-gray-900 mb-4">{resolvedTitle}</h1>
          <p className="text-2xl text-gray-600 mb-6">{resolvedSubtitle}</p>
          <p className="text-lg text-gray-700">{resolvedContent}</p>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <div className="text-sm text-gray-500">Confidential</div>
          <div className="text-sm text-gray-500">01</div>
        </div>
      </div>

      <div className="absolute top-4 right-4 bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/></svg>
        Pitch Deck - Produto
      </div>

      <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        16:9
      </div>
    </div>
  );
};
