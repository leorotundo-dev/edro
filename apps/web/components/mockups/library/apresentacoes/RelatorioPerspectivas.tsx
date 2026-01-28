import React from 'react';
import { FileText } from 'lucide-react';

interface RelatorioPerspectivasProps {
  coverImage?: string;
  companyLogo?: string;
  title?: string;
  subtitle?: string;
  year?: string;
  coverColor?: string;
}

export const RelatorioPerspectivas: React.FC<RelatorioPerspectivasProps> = ({
  coverImage = '',
  companyLogo = '',
  title = 'Annual Report',
  subtitle = 'Company performance and insights',
  year = '2026',
  coverColor = '#0f172a',
}) => {
  return (
    <div className="relative w-[297px] h-[420px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: coverColor }}
      >
        {coverImage && <img src={coverImage} alt="Cover" className="w-full h-full object-cover opacity-20" />}
      </div>
      
      <div className="relative h-full flex flex-col p-8">
        {companyLogo && (
          <div className="w-24 h-24 bg-white rounded-lg p-3 mb-auto shadow-lg">
            <img src={companyLogo} alt="Company" className="w-full h-full object-contain" />
          </div>
        )}
        
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-black text-white mb-3 drop-shadow-lg">{title}</h1>
          <p className="text-lg text-white/90 mb-4 drop-shadow-md">{subtitle}</p>
          <div className="text-6xl font-black text-white/80 drop-shadow-lg">{year}</div>
        </div>
        
        <div className="mt-auto">
          <div className="h-1 bg-white/30 rounded-full" />
        </div>
      </div>
      
      <div className="absolute top-3 right-3 bg-slate-700 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <FileText className="w-3 h-3" />
        Relatório Anual - Perspectivas
      </div>
      
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        A4
      </div>
    </div>
  );
};
