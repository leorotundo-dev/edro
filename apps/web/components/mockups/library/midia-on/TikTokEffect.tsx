import React from 'react';
import { Sparkles } from 'lucide-react';

interface TikTokEffectProps {
  effectPreview?: string;
  effectName?: string;
  creatorName?: string;
  usageCount?: string;
}

export const TikTokEffect: React.FC<TikTokEffectProps> = ({
  effectPreview = '',
  effectName = 'Effect Name',
  creatorName = 'Creator Name',
  usageCount = '1.2M',
}) => {
  return (
    <div className="w-full max-w-[375px] bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full aspect-square bg-gray-900">
        {effectPreview && <img src={effectPreview} alt={effectName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-pink-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold">
          <Sparkles className="w-3 h-3" />
          Effect
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-bold text-base text-gray-900 mb-1">{effectName}</h3>
        <p className="text-sm text-gray-600 mb-2">by {creatorName}</p>
        <p className="text-xs text-gray-500 mb-4">{usageCount} videos</p>
        <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded text-sm">
          Use Effect
        </button>
      </div>
    </div>
  );
};
