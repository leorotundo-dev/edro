import React from 'react';
import { MapPin } from 'lucide-react';

interface FacebookMarketplaceProps {
  productImage?: string;
  productName?: string;
  price?: string;
  location?: string;
  condition?: string;
}

export const FacebookMarketplace: React.FC<FacebookMarketplaceProps> = ({
  productImage = '',
  productName = 'Product Name',
  price = '$99',
  location = 'City, State',
  condition = 'New',
}) => {
  return (
    <div className="w-[240px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-square bg-gray-200">
        {productImage && <img src={productImage} alt={productName} className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-3">
        <p className="text-lg font-bold text-gray-900 mb-1">{price}</p>
        <h3 className="text-sm text-gray-900 line-clamp-2 mb-2">{productName}</h3>
        <p className="text-xs text-gray-600 mb-1">{condition}</p>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="w-3 h-3" />
          <span>{location}</span>
        </div>
      </div>
    </div>
  );
};
