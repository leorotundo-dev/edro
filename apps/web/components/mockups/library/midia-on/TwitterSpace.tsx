import React from 'react';

interface TwitterSpaceProps {
  spaceName?: string;
  title?: string;
  headline?: string;
  name?: string;
  hostName?: string;
  hostImage?: string;
  listeners?: string;
  isLive?: boolean;
}

export const TwitterSpace: React.FC<TwitterSpaceProps> = ({
  spaceName = 'Space Title',
  title,
  headline,
  name,
  hostName = 'Host Name',
  hostImage = '',
  listeners = '1.2K',
  isLive = true,
}) => {
  const resolvedSpaceName = title ?? headline ?? name ?? spaceName;

  return (
    <div className="w-full max-w-[400px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-6">
        {isLive && (
          <div className="inline-flex items-center gap-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            LIVE
          </div>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{resolvedSpaceName}</h3>
        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
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
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        Join Space
      </button>
    </div>
  );
};
