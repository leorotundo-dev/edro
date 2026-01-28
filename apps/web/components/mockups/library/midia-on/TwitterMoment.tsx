import React from 'react';

interface TwitterMomentProps {
  momentTitle?: string;
  momentImage?: string;
  tweetCount?: number;
  description?: string;
}

export const TwitterMoment: React.FC<TwitterMomentProps> = ({
  momentTitle = 'Moment Title',
  momentImage = '',
  tweetCount = 15,
  description = 'A collection of tweets about this topic',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative w-full h-[240px] bg-gray-900">
        {momentImage && <img src={momentImage} alt={momentTitle} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{momentTitle}</h3>
          <p className="text-sm text-white/90">{description}</p>
        </div>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-600">{tweetCount} Tweets</p>
      </div>
    </div>
  );
};
