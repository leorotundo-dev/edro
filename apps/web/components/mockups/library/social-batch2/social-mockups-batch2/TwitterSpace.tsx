import React from 'react';
import { Mic, Users } from 'lucide-react';

interface TwitterSpaceProps {
  spaceName?: string;
  hostName?: string;
  hostImage?: string;
  listeners?: string;
  isLive?: boolean;
}

export const TwitterSpace: React.FC<TwitterSpaceProps> = ({
  spaceName = 'Space Title',
  hostName = 'Host Name',
  hostImage = '',
  listeners = '1.2K',
  isLive = true,
}) => {
  return (
    <div className="w-full max-w-[400px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        {isLive && (
          <div className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{spaceName}</h3>
        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
          <Users className="w-4 h-4" />
          <span>{listeners} listening</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
          {hostImage && <img src={hostImage} alt={hostName} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{hostName}</p>
          <p className="text-white/80 text-xs">Host</p>
        </div>
      </div>

      <button className="w-full bg-white hover:bg-gray-100 text-gray-900 font-bold py-3 rounded-full flex items-center justify-center gap-2">
        <Mic className="w-5 h-5" />
        Join Space
      </button>
    </div>
  );
};
