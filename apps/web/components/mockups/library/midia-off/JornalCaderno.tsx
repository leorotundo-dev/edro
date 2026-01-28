import React from 'react';
import { Newspaper } from 'lucide-react';

interface JornalCadernoProps {
  headline?: string;
  subheadline?: string;
  bodyText?: string;
  adImage?: string;
}

export const JornalCaderno: React.FC<JornalCadernoProps> = ({
  headline = 'Your Headline Here',
  subheadline = 'Subheadline or tagline',
  bodyText = 'Ad body text and call to action',
  adImage = '',
}) => {
  return (
    <div className="relative w-[450px] h-[600px] bg-white border border-gray-400 shadow-md overflow-hidden">
      <div className="absolute inset-0 bg-gray-50 p-3">
        {adImage && (
          <div className="w-full h-1/2 bg-gray-200 mb-2">
            <img src={adImage} alt="Ad" className="w-full h-full object-cover" />
          </div>
        )}
        <h2 className="text-gray-900 text-xl font-black mb-1 leading-tight">{headline}</h2>
        <h3 className="text-gray-700 text-sm font-bold mb-2">{subheadline}</h3>
        <p className="text-gray-600 text-xs leading-relaxed">{bodyText}</p>
      </div>
      
      <div className="absolute top-2 right-2 bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <Newspaper className="w-3 h-3" />
        Jornal Caderno Especial
      </div>
      
      <div className="absolute bottom-2 left-2 bg-white text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
        30x40cm
      </div>
    </div>
  );
};
