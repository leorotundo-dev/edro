import React from 'react';

interface GoogleShoppingAdProps {
  productImage?: string;
  productName?: string;
  price?: string;
  storeName?: string;
  rating?: number;
}

export const GoogleShoppingAd: React.FC<GoogleShoppingAdProps> = ({
  productImage = '',
  productName = 'Product Name',
  price = '$99.99',
  storeName = 'Store Name',
  rating = 4.5,
}) => {
  return (
    <div className="w-[200px] bg-white border border-gray-200 rounded shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-square bg-gray-100">
        {productImage && <img src={productImage} alt={productName} className="w-full h-full object-contain p-4" />}
        <span className="absolute top-2 left-2 text-xs text-gray-700 bg-white px-2 py-0.5 rounded shadow-sm">Ad</span>
      </div>
      <div className="p-3">
        <p className="text-lg font-bold text-gray-900 mb-1">{price}</p>
        <h4 className="text-sm text-gray-900 line-clamp-2 mb-1">{productName}</h4>
        <p className="text-xs text-gray-600">{storeName}</p>
        {rating && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-yellow-500 text-xs">★</span>
            <span className="text-xs text-gray-600">{rating}</span>
          </div>
        )}
      </div>
    </div>
  );
};
