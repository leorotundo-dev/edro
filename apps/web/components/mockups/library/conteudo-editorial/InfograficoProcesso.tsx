import React from 'react';
import { FileText } from 'lucide-react';

interface InfograficoProcessoProps {
  title?: string;
  author?: string;
  date?: string;
  content?: string;
}

export const InfograficoProcesso: React.FC<InfograficoProcessoProps> = ({
  title = 'Article Title',
  author = 'Author Name',
  date = 'Jan 27, 2026',
  content = 'Article content preview...',
}) => {
  return (
    <div className="relative w-full max-w-[700px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200 p-8">
      <div className="mb-4">
        <h1 className="text-4xl font-black text-gray-900 mb-3">{title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <span>{author}</span>
          <span>•</span>
          <span>{date}</span>
        </div>
      </div>
      <div className="text-base text-gray-700 leading-relaxed">{content}</div>
      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Infográfico Processo
      </div>
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Editorial</div>
    </div>
  );
};
