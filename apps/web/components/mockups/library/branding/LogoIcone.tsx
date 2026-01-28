import React from 'react';
import { Palette } from 'lucide-react';

interface LogoIconeProps {
  logoImage?: string;
  brandName?: string;
  backgroundColor?: string;
  showGrid?: boolean;
}

export const LogoIcone: React.FC<LogoIconeProps> = ({
  logoImage = '',
  brandName = 'Brand Name',
  backgroundColor = '#ffffff',
  showGrid = false,
}) => {
  return (
    <div 
      className="relative w-[300px] h-[300px] rounded-lg overflow-hidden shadow-xl border-2 border-gray-200"
      style={{ backgroundColor }}
    >
      {showGrid && (
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />
      )}
      
      <div className="relative h-full flex items-center justify-center p-8">
        {logoImage ? (
          <img src={logoImage} alt={brandName} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center">
            <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-5xl font-black text-white">{brandName.charAt(0)}</span>
            </div>
            <h2 className="text-3xl font-black text-gray-900">{brandName}</h2>
          </div>
        )}
      </div>
      
      <div className="absolute top-3 right-3 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Palette className="w-3 h-3" />
        Logo Ícone
      </div>
      
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        Square
      </div>
    </div>
  );
};
