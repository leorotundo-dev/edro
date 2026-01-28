import React from 'react';
import { Play } from 'lucide-react';

interface GoogleVideoAdProps {
  thumbnail?: string;
  headline?: string;
  description?: string;
  ctaText?: string;
}

export const GoogleVideoAd: React.FC<GoogleVideoAdProps> = ({
  thumbnail = '',
  headline = 'Video Ad Headline',
  description = 'Video description text',
  ctaText = 'Watch Now',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
      <div className="relative w-full aspect-video bg-gray-900">
        {thumbnail && <img src={thumbnail} alt="Video" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-8 h-8 text-gray-900 fill-gray-900 ml-1" />
          </div>
        </div>
        <span className="absolute top-2 left-2 text-xs text-white bg-black/60 px-2 py-0.5 rounded">Ad · 0:15</span>
      </div>
      <div className="p-4">
        <h4 className="font-semibold text-base text-gray-900 mb-1">{headline}</h4>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          {ctaText}
        </button>
      </div>
    </div>
  );
};
