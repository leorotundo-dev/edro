import React from 'react';
import { BookOpen } from 'lucide-react';

interface ManualColaboradorProps {
  coverImage?: string;
  companyLogo?: string;
  title?: string;
  subtitle?: string;
  version?: string;
  coverColor?: string;
}

export const ManualColaborador: React.FC<ManualColaboradorProps> = ({
  coverImage = '',
  companyLogo = '',
  title = 'Manual Title',
  subtitle = 'Internal documentation',
  version = 'v1.0',
  coverColor = '#059669',
}) => {
  return (
    <div className="relative w-[297px] h-[420px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: coverColor }}
      >
        {coverImage && <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-30" />}
      </div>
      
      <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
        {companyLogo && (
          <div className="w-32 h-32 bg-white rounded-lg p-4 mb-6 shadow-lg">
            <img src={companyLogo} alt="Company" className="w-full h-full object-contain" />
          </div>
        )}
        
        <h1 className="text-3xl font-black text-white mb-3 drop-shadow-lg">{title}</h1>
        <p className="text-lg text-white opacity-90 mb-4 drop-shadow-md">{subtitle}</p>
        
        <div className="mt-auto">
          <span className="inline-block bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full">
            {version}
          </span>
        </div>
      </div>
      
      <div className="absolute top-3 right-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <BookOpen className="w-3 h-3" />
        Manual do Colaborador
      </div>
      
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        A4
      </div>
    </div>
  );
};
