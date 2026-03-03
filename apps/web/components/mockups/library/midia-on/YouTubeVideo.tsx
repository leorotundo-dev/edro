import React from 'react';

interface YouTubeVideoProps {
  thumbnail?: string;
  postImage?: string;
  title?: string;
  headline?: string;
  name?: string;
  channelName?: string;
  channelImage?: string;
  views?: string;
  timeAgo?: string;
}

export const YouTubeVideo: React.FC<YouTubeVideoProps> = ({
  thumbnail = '',
  postImage,
  title = 'Video Title Goes Here',
  headline,
  name,
  channelName = 'Channel Name',
  channelImage = '',
  views = '1.2M views',
  timeAgo = '2 days ago',
}) => {
  const resolvedThumbnail = postImage ?? thumbnail;
  const resolvedTitle = headline ?? name ?? title;

  return (
    <div className="w-full max-w-[360px] bg-white">
      <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden">
        {resolvedThumbnail && <img src={resolvedThumbnail} alt={resolvedTitle} className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white fill-white ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">4:32</div>
      </div>
      <div className="flex gap-3 mt-3">
        <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{resolvedTitle}</h3>
          <p className="text-xs text-gray-600 mt-1">{channelName}</p>
          <p className="text-xs text-gray-600">{views} · {timeAgo}</p>
        </div>
      </div>
    </div>
  );
};
