import React from 'react';

interface YouTubeThumbnailProps {
  thumbnail?: string;
  title?: string;
  duration?: string;
}

export const YouTubeThumbnail: React.FC<YouTubeThumbnailProps> = ({
  thumbnail = '',
  title = 'Video Title',
  duration = '10:24',
}) => {
  return (
    <div className="w-full max-w-[640px] bg-white rounded-lg overflow-hidden shadow-sm">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt={title} className="w-full h-full object-cover" />}
        <div className="absolute bottom-2 right-2 bg-black/90 text-white text-xs font-semibold px-2 py-1 rounded">
          {duration}
        </div>
      </div>
      {title && (
        <div className="p-3 bg-gray-50">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
        </div>
      )}
    </div>
  );
};
