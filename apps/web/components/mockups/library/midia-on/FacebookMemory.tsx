import React from 'react';
import { Clock } from 'lucide-react';

interface FacebookMemoryProps {
  memoryImage?: string;
  yearsAgo?: number;
  originalDate?: string;
  caption?: string;
}

export const FacebookMemory: React.FC<FacebookMemoryProps> = ({
  memoryImage = '',
  yearsAgo = 5,
  originalDate = 'January 27, 2021',
  caption = 'Great memories from this day',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5" />
          <span className="font-semibold text-sm">On This Day</span>
        </div>
        <p className="text-2xl font-bold">{yearsAgo} Years Ago</p>
        <p className="text-sm opacity-90">{originalDate}</p>
      </div>
      
      <div className="w-full aspect-square bg-gray-200">
        {memoryImage && <img src={memoryImage} alt="Memory" className="w-full h-full object-cover" />}
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-900">{caption}</p>
        <button className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Share Memory
        </button>
      </div>
    </div>
  );
};
