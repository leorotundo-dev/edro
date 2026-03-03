import React from 'react';

interface FacebookMemoryProps {
  memoryImage?: string;
  yearsAgo?: number;
  originalDate?: string;
  caption?: string;
  content?: string;
  text?: string;
  body?: string;
}

export const FacebookMemory: React.FC<FacebookMemoryProps> = ({
  memoryImage = '',
  yearsAgo = 5,
  originalDate = 'January 27, 2021',
  caption = 'Great memories from this day',
  content,
  text,
  body,
}) => {
  const resolvedCaption = content ?? text ?? body ?? caption;

  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span className="font-semibold text-sm">On This Day</span>
        </div>
        <p className="text-2xl font-bold">{yearsAgo} Years Ago</p>
        <p className="text-sm opacity-90">{originalDate}</p>
      </div>

      <div className="w-full aspect-square bg-gray-200">
        {memoryImage && <img src={memoryImage} alt="Memory" className="w-full h-full object-cover" />}
      </div>

      <div className="p-4">
        <p className="text-sm text-gray-900">{resolvedCaption}</p>
        <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Share Memory
        </button>
      </div>
    </div>
  );
};
