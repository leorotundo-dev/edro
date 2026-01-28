import React from 'react';

interface PinterestBoardProps {
  boardName?: string;
  pinCount?: number;
  coverImages?: string[];
}

export const PinterestBoard: React.FC<PinterestBoardProps> = ({
  boardName = 'Board Name',
  pinCount = 24,
  coverImages = ['', '', '', ''],
}) => {
  return (
    <div className="w-full max-w-[236px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="grid grid-cols-2 gap-0.5 aspect-square bg-gray-200">
        {coverImages.slice(0, 4).map((img, i) => (
          <div key={i} className="bg-gray-300">
            {img && <img src={img} alt={`Pin ${i+1}`} className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-base text-gray-900">{boardName}</h3>
        <p className="text-sm text-gray-600 mt-1">{pinCount} pins</p>
      </div>
    </div>
  );
};
