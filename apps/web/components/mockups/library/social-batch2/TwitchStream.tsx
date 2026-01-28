import React from 'react';

interface TwitchStreamProps {
  thumbnail?: string;
  streamTitle?: string;
  streamerName?: string;
  game?: string;
  viewers?: string;
  isLive?: boolean;
}

export const TwitchStream: React.FC<TwitchStreamProps> = ({
  thumbnail = '',
  streamTitle = 'Stream Title',
  streamerName = 'StreamerName',
  game = 'Game Name',
  viewers = '2.4K',
  isLive = true,
}) => {
  return (
    <div className="w-full max-w-[350px] bg-[#18181B] rounded-lg overflow-hidden shadow-lg">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={streamTitle} className="w-full h-full object-cover" />}
        {isLive && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
            LIVE
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-0.5 rounded">
          {viewers} viewers
        </div>
      </div>
      
      <div className="p-3">
        <div className="flex gap-2">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-white line-clamp-1">{streamerName}</p>
            <p className="text-sm text-gray-300 line-clamp-1">{streamTitle}</p>
            <p className="text-xs text-gray-400">{game}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
