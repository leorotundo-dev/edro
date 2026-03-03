import React from 'react';

interface PinterestShopProps {
  productImage?: string;
  postImage?: string;
  thumbnail?: string;
  productName?: string;
  title?: string;
  headline?: string;
  name?: string;
  price?: string;
  storeName?: string;
  inStock?: boolean;
}

export const PinterestShop: React.FC<PinterestShopProps> = ({
  productImage = '',
  postImage,
  thumbnail,
  productName = 'Product Name',
  title,
  headline,
  name,
  price = '$99.00',
  storeName = 'Store Name',
  inStock = true,
}) => {
  const resolvedProductImage = postImage ?? thumbnail ?? productImage;
  const resolvedProductName = title ?? headline ?? name ?? productName;

  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-[3/4] bg-gray-200">
        {resolvedProductImage && <img src={resolvedProductImage} alt={resolvedProductName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-white rounded-full px-3 py-1 flex items-center gap-1 shadow-md">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          <span className="text-xs font-semibold text-gray-900">{price}</span>
        </div>
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 font-bold px-4 py-2 rounded">Out of Stock</span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{resolvedProductName}</h3>
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
