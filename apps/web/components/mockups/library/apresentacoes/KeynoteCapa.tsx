import React from 'react';

interface KeynoteCapaProps {
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
  backgroundImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  themeColor?: string;
}

export const KeynoteCapa: React.FC<KeynoteCapaProps> = ({
  title,
  headline,
  name,
  subtitle,
  description,
  content,
  text,
  body,
  caption,
  backgroundImage,
  image,
  postImage,
  thumbnail,
  themeColor = '#6366f1',
}) => {
  const resolvedTitle = title ?? headline ?? name ?? 'Slide Title';
  const resolvedSubtitle = subtitle ?? description ?? 'Subtitle';
  const resolvedContent = content ?? text ?? body ?? caption ?? 'Content';
  const resolvedBackgroundImage = backgroundImage ?? image ?? postImage ?? thumbnail ?? '';

  return (
    <div className="relative w-full max-w-[800px] aspect-video bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden shadow-2xl border border-gray-200">
      <div className="absolute inset-0">
        {resolvedBackgroundImage && <img src={resolvedBackgroundImage} alt="Background" className="w-full h-full object-cover opacity-5" />}
      </div>

      <div className="relative h-full flex flex-col items-center justify-center p-16 text-center">
        <div
          className="w-20 h-1 rounded-full mb-8"
          style={{ backgroundColor: themeColor }}
        />

        <h1
          className="text-6xl font-black mb-6"
          style={{ color: themeColor }}
        >
          {resolvedTitle}
        </h1>

        <p className="text-2xl text-gray-700 mb-4">{resolvedSubtitle}</p>
        <p className="text-lg text-gray-600 max-w-2xl">{resolvedContent}</p>
      </div>

      <div className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        Keynote - Capa
      </div>

      <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        16:9
      </div>
    </div>
  );
};
