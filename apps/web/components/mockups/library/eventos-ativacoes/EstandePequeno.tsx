import React from 'react';
import { Store } from 'lucide-react';

interface EstandePequenoProps {
  brandLogo?: string;
  brandName?: string;
  tagline?: string;
  backgroundImage?: string;
  accentColor?: string;
}

export const EstandePequeno: React.FC<EstandePequenoProps> = ({
  brandLogo = '',
  brandName = 'Brand Name',
  tagline = 'Your tagline here',
  backgroundImage = '',
  accentColor = '#2563eb',
}) => {
  return (
    <div className="relative w-full max-w-[400px] h-[500px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-xl">
      <div className="absolute inset-0 bg-gray-100">
        {backgroundImage && <img src={backgroundImage} alt="Booth" className="w-full h-full object-cover opacity-30" />}
      </div>
      
      <div className="relative h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-32 h-32 mb-4">
            <img src={brandLogo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h2 className="text-2xl font-black text-gray-900 mb-2 text-center">{brandName}</h2>
        <p className="text-base text-gray-700 text-center">{tagline}</p>
        
        <div 
          className="absolute bottom-0 left-0 right-0 h-2"
          style={{ backgroundColor: accentColor }}
        />
      </div>
      
      <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Store className="w-3 h-3" />
        Estande Pequeno
      </div>
      
      <div className="absolute bottom-3 left-3 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded">
        9m²
      </div>
    </div>
  );
};
