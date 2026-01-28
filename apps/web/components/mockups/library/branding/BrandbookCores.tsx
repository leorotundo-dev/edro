import React from 'react';
import { Book } from 'lucide-react';

interface BrandbookCoresProps {
  brandLogo?: string;
  brandName?: string;
  title?: string;
  content?: string;
  brandColor?: string;
}

export const BrandbookCores: React.FC<BrandbookCoresProps> = ({
  brandLogo = '',
  brandName = 'Brand Name',
  title = 'Section Title',
  content = 'Brand guidelines and specifications',
  brandColor = '#2563eb',
}) => {
  return (
    <div className="relative w-[297px] h-[420px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div 
        className="h-24 flex items-center justify-between px-6"
        style={{ backgroundColor: brandColor }}
      >
        {brandLogo && (
          <div className="w-16 h-16 bg-white rounded p-2">
            <img src={brandLogo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h3 className="text-white font-bold text-lg">{brandName}</h3>
      </div>
      
      <div className="p-6">
        <h1 className="text-3xl font-black text-gray-900 mb-4">{title}</h1>
        <p className="text-base text-gray-700 leading-relaxed">{content}</p>
        
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
      
      <div className="absolute top-3 right-3 bg-pink-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Book className="w-3 h-3" />
        Brandbook - Cores
      </div>
      
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        A4
      </div>
    </div>
  );
};
