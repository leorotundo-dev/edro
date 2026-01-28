import React from 'react';
import { ShoppingCart } from 'lucide-react';

interface BannerLancamentoProps {
  title?: string;
  subtitle?: string;
  image?: string;
  price?: string;
  brandColor?: string;
}

export const BannerLancamento: React.FC<BannerLancamentoProps> = ({
  title = 'Product Title',
  subtitle = 'Product description',
  image = '',
  price = '$99.99',
  brandColor = '#f97316',
}) => {
  return (
    <div className="relative w-full max-w-[800px] h-[500px] bg-white rounded-lg overflow-hidden shadow-xl border-2 border-gray-200">
      <div className="h-full flex flex-col p-8">
        <div className="flex-1 flex items-center justify-center">
          {image ? (
            <img src={image} alt={title} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <ShoppingCart className="w-24 h-24 text-gray-300" />
            </div>
          )}
        </div>
        
        <div className="mt-6">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{title}</h2>
          <p className="text-lg text-gray-600 mb-3">{subtitle}</p>
          <div 
            className="text-4xl font-black"
            style={{ color: brandColor }}
          >
            {price}
          </div>
        </div>
      </div>
      
      <div className="absolute top-3 right-3 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <ShoppingCart className="w-3 h-3" />
        Banner Lançamento
      </div>
      
      <div className="absolute bottom-3 left-3 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
        E-commerce
      </div>
    </div>
  );
};
