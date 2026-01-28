import React from 'react';
import { Presentation } from 'lucide-react';

interface PitchProdutoProps {
  title?: string;
  subtitle?: string;
  content?: string;
  logo?: string;
  backgroundImage?: string;
  accentColor?: string;
}

export const PitchProduto: React.FC<PitchProdutoProps> = ({
  title = 'Slide Title',
  subtitle = 'Subtitle or description',
  content = 'Main content goes here',
  logo = '',
  backgroundImage = '',
  accentColor = '#f59e0b',
}) => {
  return (
    <div className="relative w-full max-w-[800px] aspect-video bg-white rounded-lg overflow-hidden shadow-2xl border-2 border-gray-200">
      <div className="absolute inset-0">
        {backgroundImage && <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-10" />}
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
          <h1 className="text-5xl font-black text-gray-900 mb-4">{title}</h1>
          <p className="text-2xl text-gray-600 mb-6">{subtitle}</p>
          <p className="text-lg text-gray-700">{content}</p>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="text-sm text-gray-500">Confidential</div>
          <div className="text-sm text-gray-500">01</div>
        </div>
      </div>
      
      <div className="absolute top-4 right-4 bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Presentation className="w-3 h-3" />
        Pitch Deck - Produto
      </div>
      
      <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        16:9
      </div>
    </div>
  );
};
