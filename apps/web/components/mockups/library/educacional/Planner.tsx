import React from 'react';

interface PlannerProps {
  title?: string;
  headline?: string;
  name?: string;
  subtitle?: string;
  description?: string;
  content?: string;
  text?: string;
  body?: string;
  caption?: string;
}

export const Planner: React.FC<PlannerProps> = ({
  title,
  headline,
  name,
  subtitle,
  description,
  content,
  text,
  body,
  caption,
}) => {
  const resolvedTitle = title ?? headline ?? name ?? 'Lesson Title';
  const resolvedSubtitle = subtitle ?? description ?? 'Learning objectives';
  const resolvedContent = content ?? text ?? body ?? caption ?? 'Educational content...';

  return (
    <div className="relative w-full max-w-[700px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200 p-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-green-600 mb-2">{resolvedTitle}</h1>
        <p className="text-lg text-gray-600">{resolvedSubtitle}</p>
      </div>
      <div className="text-base text-gray-700">{resolvedContent}</div>
      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
        Planner
      </div>
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Educacional</div>
    </div>
  );
};
