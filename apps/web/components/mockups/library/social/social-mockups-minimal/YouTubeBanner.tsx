import React from 'react';

interface YouTubeBannerProps {
  bannerImage?: string;
  channelImage?: string;
  channelName?: string;
  subscribers?: string;
}

export const YouTubeBanner: React.FC<YouTubeBannerProps> = ({
  bannerImage = '',
  channelImage = '',
  channelName = 'Channel Name',
  subscribers = '1.2M subscribers',
}) => {
  return (
    <div className="w-full max-w-[1200px] bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="relative w-full h-[200px] bg-gray-200">
        {bannerImage && <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{channelName}</h1>
            <p className="text-sm text-gray-600 mt-1">{subscribers}</p>
          </div>
          <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-full">
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};
