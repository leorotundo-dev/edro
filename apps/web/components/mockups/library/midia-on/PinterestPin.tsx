import React from 'react';

interface PinterestPinProps {
  pinImage?: string;
  title?: string;
  description?: string;
  saves?: number;
}

export const PinterestPin: React.FC<PinterestPinProps> = ({
  pinImage = '',
  title = 'Pin Title',
  description = 'Pin description text',
  saves = 234,
}) => {
  return (
    <div className="w-full max-w-[236px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative w-full aspect-[2/3] bg-gray-200">
        {pinImage && <img src={pinImage} alt={title} className="w-full h-full object-cover" />}
        <button className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-full text-sm">
          Save
        </button>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{title}</h3>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description}</p>
        <p className="text-xs text-gray-500 mt-2">{saves} saves</p>
      </div>
    </div>
  );
};
