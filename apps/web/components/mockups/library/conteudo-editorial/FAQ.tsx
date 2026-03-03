import React from 'react';

interface FAQProps {
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
  author?: string;
  date?: string;
}

export const FAQ: React.FC<FAQProps> = ({
  title,
  headline,
  name,
  subtitle,
  description,
  content,
  text,
  body,
  caption,
  author = 'Author Name',
  date = 'Jan 27, 2026',
}) => {
  const resolvedTitle = title || headline || name || 'Article Title';
  const resolvedSubtitle = subtitle || description || body;
  const resolvedContent = content || text || caption || 'Article content preview...';
  return (
    <div className="relative w-full max-w-[700px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200 p-8">
      <div className="mb-4">
        <h1 className="text-4xl font-black text-gray-900 mb-3">{resolvedTitle}</h1>
        {resolvedSubtitle && <p className="text-base text-gray-600 mb-2">{resolvedSubtitle}</p>}
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{author}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="text-base text-gray-700 leading-relaxed">{resolvedContent}</div>
      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        FAQ
      </div>
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Editorial</div>
    </div>
  );
};
