import React from 'react';

interface PinterestTrendProps {
  trendImage?: string;
  postImage?: string;
  thumbnail?: string;
  trendName?: string;
  title?: string;
  headline?: string;
  name?: string;
  growthPercentage?: number;
  pinCount?: string;
}

export const PinterestTrend: React.FC<PinterestTrendProps> = ({
  trendImage = '',
  postImage,
  thumbnail,
  trendName = 'Trending Topic',
  title,
  headline,
  name,
  growthPercentage = 150,
  pinCount = '1.2M',
}) => {
  const resolvedTrendImage = postImage ?? thumbnail ?? trendImage;
  const resolvedTrendName = title ?? headline ?? name ?? trendName;

  return (
    <div className="w-full max-w-[300px] bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full aspect-square bg-gray-200">
        {resolvedTrendImage && <img src={resolvedTrendImage} alt={resolvedTrendName} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full flex items-center gap-1 text-xs font-bold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
          +{growthPercentage}%
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <h3 className="font-bold text-lg mb-1">{resolvedTrendName}</h3>
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
