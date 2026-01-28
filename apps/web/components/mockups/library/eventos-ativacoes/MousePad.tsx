import React from 'react';
import { Gift } from 'lucide-react';

interface MousePadProps {
  productImage?: string;
  brandLogo?: string;
  brandColor?: string;
}

export const MousePad: React.FC<MousePadProps> = ({
  productImage = '',
  brandLogo = '',
  brandColor = '#10b981',
}) => {
  return (
    <div className="relative w-[320px] h-[280px] bg-white border-2 border-gray-200 rounded-lg overflow-hidden shadow-md">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        {productImage ? (
          <img src={productImage} alt="Product" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center">
            <div 
              className="w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${brandColor}20` }}
            >
              <Gift className="w-10 h-10" style={{ color: brandColor }} />
            </div>
            {brandLogo && (
              <div className="w-24 h-12">
                <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
              </div>
            )}
          </div>
        )}
      </div>
      
      <div 
        className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-1 rounded"
        style={{ backgroundColor: brandColor }}
      >
        Mouse Pad
      </div>
      
      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded border border-gray-300">
        20x24cm
      </div>
    </div>
  );
};
