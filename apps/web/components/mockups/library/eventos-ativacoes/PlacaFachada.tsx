import React from 'react';
import { Navigation } from 'lucide-react';

interface PlacaFachadaProps {
  brandName?: string;
  brandLogo?: string;
  tagline?: string;
  backgroundColor?: string;
  textColor?: string;
}

export const PlacaFachada: React.FC<PlacaFachadaProps> = ({
  brandName = 'Brand Name',
  brandLogo = '',
  tagline = 'Your tagline here',
  backgroundColor = '#1f2937',
  textColor = '#ffffff',
}) => {
  return (
    <div 
      className="relative w-full max-w-[700px] h-[250px] rounded-lg overflow-hidden shadow-2xl border-4"
      style={{ backgroundColor, borderColor: '#374151' }}
    >
      <div className="h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-32 h-32 mb-4">
            <img src={brandLogo} alt={brandName} className="w-full h-full object-contain" />
          </div>
        )}
        <h2 
          className="text-3xl font-black text-center mb-2"
          style={{ color: textColor }}
        >
          {brandName}
        </h2>
        <p 
          className="text-base text-center"
          style={{ color: textColor, opacity: 0.9 }}
        >
          {tagline}
        </p>
      </div>
      
      <div className="absolute top-3 right-3 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Navigation className="w-3 h-3" />
        Placa de Fachada
      </div>
      
      <div className="absolute bottom-3 left-3 bg-black/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
