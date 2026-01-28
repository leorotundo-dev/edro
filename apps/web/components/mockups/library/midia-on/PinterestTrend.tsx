import React from 'react';
import { TrendingUp } from 'lucide-react';

interface PinterestTrendProps {
  trendImage?: string;
  trendName?: string;
  growthPercentage?: number;
  pinCount?: string;
}

export const PinterestTrend: React.FC<PinterestTrendProps> = ({
  trendImage = '',
  trendName = 'Trending Topic',
  growthPercentage = 150,
  pinCount = '1.2M',
}) => {
  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-square bg-gray-200">
        {trendImage && <img src={trendImage} alt={trendName} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold">
          <TrendingUp className="w-3 h-3" />
          +{growthPercentage}%
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-bold text-lg mb-1">{trendName}</h3>
          <p className="text-xs opacity-90">{pinCount} pins</p>
        </div>
      </div>
      
      <div className="p-3">
        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-full text-xs">
          Explore Trend
        </button>
      </div>
    </div>
  );
};
