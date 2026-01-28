import React from 'react';
import { Tv } from 'lucide-react';

interface TVCorporativaAvisosProps {
  companyLogo?: string;
  title?: string;
  content?: string;
  backgroundImage?: string;
  accentColor?: string;
}

export const TVCorporativaAvisos: React.FC<TVCorporativaAvisosProps> = ({
  companyLogo = '',
  title = 'Content Title',
  content = 'Main content or message',
  backgroundImage = '',
  accentColor = '#8b5cf6',
}) => {
  return (
    <div className="relative w-full max-w-[800px] aspect-video bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg overflow-hidden shadow-2xl">
      <div className="absolute inset-0">
        {backgroundImage && <img src={backgroundImage} alt="Background" className="w-full h-full object-cover opacity-20" />}
      </div>
      
      <div className="relative h-full flex flex-col p-8">
        <div className="flex items-center justify-between mb-auto">
          {companyLogo && (
            <div className="w-24 h-24">
              <img src={companyLogo} alt="Company" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-white text-sm opacity-75">
            {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
        
        <div className="text-center">
          <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">{title}</h1>
          <p className="text-2xl text-white opacity-90 drop-shadow-md">{content}</p>
        </div>
        
        <div 
          className="mt-auto h-2 rounded-full"
          style={{ backgroundColor: accentColor }}
        />
      </div>
      
      <div className="absolute top-4 right-4 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Tv className="w-3 h-3" />
        TV Corporativa Avisos
      </div>
      
      <div className="absolute bottom-4 left-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
        16:9
      </div>
    </div>
  );
};
