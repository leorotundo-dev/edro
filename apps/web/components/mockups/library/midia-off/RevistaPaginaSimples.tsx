import React from 'react';
import { BookOpen } from 'lucide-react';

interface RevistaPaginaSimplesProps {
  coverImage?: string;
  headline?: string;
  subheadline?: string;
  brandLogo?: string;
}

export const RevistaPaginaSimples: React.FC<RevistaPaginaSimplesProps> = ({
  coverImage = '',
  headline = 'Your Headline',
  subheadline = 'Subheadline or description',
  brandLogo = '',
}) => {
  return (
    <div className="relative w-[315px] h-[420px] bg-white border border-gray-300 shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-gray-100">
        {coverImage && <img src={coverImage} alt="Magazine" className="w-full h-full object-cover" />}
      </div>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
        {brandLogo && (
          <div className="w-20 h-20 mb-3">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
          </div>
        )}
        <h3 className="text-gray-900 text-lg font-bold text-center mb-2">{headline}</h3>
        <p className="text-gray-700 text-sm text-center">{subheadline}</p>
      </div>
      
      <div className="absolute top-2 right-2 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        Revista Página Simples
      </div>
      
      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded">
        21x28cm
      </div>
    </div>
  );
};
