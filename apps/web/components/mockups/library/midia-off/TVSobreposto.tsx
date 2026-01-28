import React from 'react';
import { Play, Volume2 } from 'lucide-react';

interface TVSobrepostoProps {
  thumbnail?: string;
  brandLogo?: string;
  tagline?: string;
}

export const TVSobreposto: React.FC<TVSobrepostoProps> = ({
  thumbnail = '',
  brandLogo = '',
  tagline = 'Your Brand Message',
}) => {
  return (
    <div className="relative w-full max-w-[640px] aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gray-900">
        {thumbnail && <img src={thumbnail} alt="Commercial" className="w-full h-full object-cover" />}
      </div>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
          <Play className="w-10 h-10 text-white fill-white ml-1" />
        </div>
        {brandLogo && (
          <div className="w-32 h-16 mb-2">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
          </div>
        )}
        <p className="text-white text-lg font-bold text-center px-4">{tagline}</p>
      </div>
      
      <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
        GC
      </div>
      
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
        <Volume2 className="w-3 h-3" />
        <span>TV Sobreposto/GC</span>
      </div>
    </div>
  );
};
