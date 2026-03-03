import React from 'react';

interface NewsletterAniversariantesProps {
  companyLogo?: string;
  companyName?: string;
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  contentImage?: string;
  postImage?: string;
  thumbnail?: string;
  bodyText?: string;
  text?: string;
  body?: string;
  caption?: string;
  ctaText?: string;
  brandColor?: string;
}

export const NewsletterAniversariantes: React.FC<NewsletterAniversariantesProps> = ({
  companyLogo = '',
  companyName = 'Company Name',
  title,
  headline,
  name,
  subtitle,
  description,
  contentImage,
  postImage,
  thumbnail,
  bodyText,
  text,
  body,
  caption,
  ctaText = 'Read More',
  brandColor = '#3b82f6',
}) => {
  const resolvedTitle = title || headline || name || 'Newsletter Title';
  const resolvedSubtitle = subtitle || description || 'Edition subtitle or date';
  const resolvedContentImage = contentImage || postImage || thumbnail || '';
  const resolvedBodyText = bodyText || text || body || caption || 'Newsletter content goes here. Share important updates, news, and information with your team.';
  return (
    <div className="w-full max-w-[600px] min-h-[600px] bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
      <div
        className="p-6 text-white"
        style={{ backgroundColor: brandColor }}
      >
        <div className="flex items-center gap-3 mb-4">
          {companyLogo && (
            <div className="w-12 h-12 bg-white rounded">
              <img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-1" />
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{companyName}</h3>
            <p className="text-xs opacity-90">{resolvedSubtitle}</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
        </div>
        <h1 className="text-2xl font-black">{resolvedTitle}</h1>
      </div>

      <div className="p-6">
        {resolvedContentImage && (
          <div className="w-full h-48 bg-gray-200 rounded mb-4">
            <img src={resolvedContentImage} alt="Content" className="w-full h-full object-cover rounded" />
          </div>
        )}

        <p className="text-gray-700 text-sm leading-relaxed mb-4">{resolvedBodyText}</p>

        <button
          className="text-white font-semibold py-2 px-6 rounded text-sm"
          style={{ backgroundColor: brandColor }}
        >
          {ctaText}
        </button>
      </div>

      <div className="absolute top-2 right-2 bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded">
        Newsletter Aniversariantes
      </div>

      <div className="px-6 pb-4 text-center text-xs text-gray-500">
        Internal Communication • Email
      </div>
    </div>
  );
};
