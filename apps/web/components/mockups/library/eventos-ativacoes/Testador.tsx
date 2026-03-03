import React from 'react';

interface TestadorProps {
  displayImage?: string;
  postImage?: string;
  thumbnail?: string;
  productName?: string;
  title?: string;
  headline?: string;
  name?: string;
  brandLogo?: string;
  promoText?: string;
}

export const Testador: React.FC<TestadorProps> = ({
  displayImage,
  postImage,
  thumbnail,
  productName,
  title,
  headline,
  name,
  brandLogo = '',
  promoText = 'Special Offer',
}) => {
  const resolvedDisplayImage = displayImage ?? postImage ?? thumbnail ?? '';
  const resolvedProductName = productName ?? title ?? headline ?? name ?? 'Product Name';
  return (
    <div className="relative w-[250px] h-[350px] bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-white">
        {resolvedDisplayImage && (
          <div className="w-full h-2/3">
            <img src={resolvedDisplayImage} alt="Display" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      <div className="relative h-full flex flex-col items-center justify-center p-4">
        {brandLogo && (
          <div className="w-24 h-24 mb-3">
            <img src={brandLogo} alt="Brand" className="w-full h-full object-contain" />
          </div>
        )}
        <h3 className="text-lg font-black text-gray-900 text-center mb-2">{resolvedProductName}</h3>
        <p className="text-sm font-bold text-orange-600 text-center">{promoText}</p>
      </div>

      <div className="absolute top-2 right-2 bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
        Testador
      </div>

      <div className="absolute bottom-2 left-2 bg-white/90 text-gray-900 text-xs px-2 py-1 rounded">
        Variable
      </div>
    </div>
  );
};
