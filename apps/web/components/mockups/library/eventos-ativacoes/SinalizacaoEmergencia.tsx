import React from 'react';
import { MapPin } from 'lucide-react';

interface SinalizacaoEmergenciaProps {
  text?: string;
  icon?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
}

export const SinalizacaoEmergencia: React.FC<SinalizacaoEmergenciaProps> = ({
  text = 'Direction or Label',
  icon,
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
}) => {
  return (
    <div 
      className="relative w-[300px] h-[200px] rounded-lg overflow-hidden shadow-md border-2"
      style={{ backgroundColor, borderColor: '#e5e7eb' }}
    >
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center">
          {icon && (
            <div className="mb-2 flex justify-center">
              {icon}
            </div>
          )}
          <p 
            className="text-lg font-bold"
            style={{ color: textColor }}
          >
            {text}
          </p>
        </div>
      </div>
      
      <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        Sinalização Emergência
      </div>
      
      <div className="absolute bottom-2 left-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
