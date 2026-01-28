import React from 'react';
import { Monitor } from 'lucide-react';

interface KeynoteObrigadoProps {
  title?: string;
  subtitle?: string;
  content?: string;
  backgroundImage?: string;
  themeColor?: string;
}

export const KeynoteObrigado: React.FC<KeynoteObrigadoProps> = ({
  title = 'Slide Title',
  subtitle = 'Subtitle',
  content = 'Content',
  backgroundImage = '',
  themeColor = '#6366f1',
}) => {
  return (
    <div className="relative w-full max-w-[800px] aspect-video bg-gradient-to-br from-gray-50 to-white rounded-lg overflow-hidden shadow-2xl border border-gray-200">
      <div className="absolute inset-0">
        {backgroundImage && <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-5" />}
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
          {title}
        </h1>
        
        <p className="text-2xl text-gray-700 mb-4">{subtitle}</p>
        <p className="text-lg text-gray-600 max-w-2xl">{content}</p>
      </div>
      
      <div className="absolute top-4 right-4 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Monitor className="w-3 h-3" />
        Keynote - Obrigado
      </div>
      
      <div className="absolute bottom-4 left-4 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        16:9
      </div>
    </div>
  );
};
