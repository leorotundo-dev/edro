import React from 'react';
import { ShoppingBag } from 'lucide-react';

interface PinterestShopProps {
  productImage?: string;
  productName?: string;
  price?: string;
  storeName?: string;
  inStock?: boolean;
}

export const PinterestShop: React.FC<PinterestShopProps> = ({
  productImage = '',
  productName = 'Product Name',
  price = '$99.00',
  storeName = 'Store Name',
  inStock = true,
}) => {
  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-[3/4] bg-gray-200">
        {productImage && <img src={productImage} alt={productName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 flex items-center gap-1 shadow-md">
          <ShoppingBag className="w-4 h-4 text-red-600" />
          <span className="text-xs font-semibold text-gray-900">{price}</span>
        </div>
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 font-bold px-4 py-2 rounded">Out of Stock</span>
          </div>
        )}
      </div>
      
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{productName}</h3>
        <p className="text-xs text-gray-600">{storeName}</p>
        {inStock && (
          <button className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-full text-xs">
            Shop Now
          </button>
        )}
      </div>
    </div>
  );
};
