import React from 'react';
import { GraduationCap } from 'lucide-react';

interface SlideAulaCapaProps {
  title?: string;
  subtitle?: string;
  content?: string;
}

export const SlideAulaCapa: React.FC<SlideAulaCapaProps> = ({
  title = 'Lesson Title',
  subtitle = 'Learning objectives',
  content = 'Educational content...',
}) => {
  return (
    <div className="relative w-full max-w-[700px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200 p-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-black text-green-600 mb-2">{title}</h1>
        <p className="text-lg text-gray-600">{subtitle}</p>
      </div>
      <div className="text-base text-gray-700">{content}</div>
      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <GraduationCap className="w-3 h-3" />
        Slide Aula Capa
      </div>
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">Educacional</div>
    </div>
  );
};
