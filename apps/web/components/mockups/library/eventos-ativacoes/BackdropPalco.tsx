import React from 'react';
import { Presentation } from 'lucide-react';

interface BackdropPalcoProps {
  backgroundImage?: string;
  eventName?: string;
  brandLogo?: string;
  themeColor?: string;
}

export const BackdropPalco: React.FC<BackdropPalcoProps> = ({
  backgroundImage = '',
  eventName = 'Event Name',
  brandLogo = '',
  themeColor = '#6366f1',
}) => {
  return (
    <div className="relative w-full max-w-[800px] h-[400px] bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
      <div className="absolute inset-0">
        {backgroundImage && <img src={backgroundImage} alt="Stage" className="w-full h-full object-cover opacity-40" />}
      </div>
      
      <div 
        className="absolute inset-0 opacity-60"
        style={{ background: `linear-gradient(135deg, ${themeColor} 0%, transparent 100%)` }}
      />
      
      <div className="relative h-full flex flex-col items-center justify-center p-6">
        {brandLogo && (
          <div className="w-40 h-40 mb-4">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
        )}
        <h1 className="text-4xl font-black text-white text-center drop-shadow-lg">{eventName}</h1>
      </div>
      
      <div className="absolute top-3 right-3 bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Presentation className="w-3 h-3" />
        Backdrop Palco
      </div>
      
      <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
        6x3m
      </div>
    </div>
  );
};
