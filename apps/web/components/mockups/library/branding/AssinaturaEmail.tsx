import React from 'react';
import { Sparkles } from 'lucide-react';

interface AssinaturaEmailProps {
  brandLogo?: string;
  brandName?: string;
  brandColor?: string;
  content?: string;
}

export const AssinaturaEmail: React.FC<AssinaturaEmailProps> = ({
  brandLogo = '',
  brandName = 'Brand Name',
  brandColor = '#10b981',
  content = 'Brand identity element',
}) => {
  return (
    <div className="relative w-full max-w-[600px] h-[200px] bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-lg">
      <div className="h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-24 h-24 mb-4">
            <img src={brandLogo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}
        
        <h2 className="text-2xl font-black text-gray-900 mb-2">{brandName}</h2>
        <p className="text-sm text-gray-600 text-center">{content}</p>
        
        <div 
          className="mt-4 w-full h-2 rounded-full"
          style={{ backgroundColor: brandColor }}
        />
      </div>
      
      <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        Assinatura de Email
      </div>
      
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
