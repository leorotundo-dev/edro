import React from 'react';
import { Radio, Volume2, Play } from 'lucide-react';

interface RadioOfertasProps {
  brandName?: string;
  message?: string;
  voiceType?: string;
}

export const RadioOfertas: React.FC<RadioOfertasProps> = ({
  brandName = 'Brand Name',
  message = 'Your radio message here',
  voiceType = 'Male Voice',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
          <Radio className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1 text-white">
          <h3 className="text-lg font-bold">Rádio Ofertas</h3>
          <p className="text-sm opacity-90">{brandName}</p>
        </div>
        <div className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
          30"
        </div>
      </div>
      
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
        <p className="text-white text-sm leading-relaxed">{message}</p>
      </div>
      
      <div className="flex items-center justify-between text-white text-xs">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          <span>{voiceType}</span>
        </div>
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4" />
          <span>Audio Spot</span>
        </div>
      </div>
    </div>
  );
};
