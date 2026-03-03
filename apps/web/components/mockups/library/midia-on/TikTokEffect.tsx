import React from 'react';

interface TikTokEffectProps {
  effectPreview?: string;
  postImage?: string;
  thumbnail?: string;
  effectName?: string;
  title?: string;
  headline?: string;
  name?: string;
  creatorName?: string;
  usageCount?: string;
}

export const TikTokEffect: React.FC<TikTokEffectProps> = ({
  effectPreview = '',
  postImage,
  thumbnail,
  effectName = 'Effect Name',
  title,
  headline,
  name,
  creatorName = 'Creator Name',
  usageCount = '1.2M',
}) => {
  const resolvedEffectPreview = postImage ?? thumbnail ?? effectPreview;
  const resolvedEffectName = title ?? headline ?? name ?? effectName;

  return (
    <div className="w-full max-w-[375px] bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full aspect-square bg-gray-900">
        {resolvedEffectPreview && <img src={resolvedEffectPreview} alt={resolvedEffectName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-pink-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
          Effect
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-base text-gray-900 mb-1">{resolvedEffectName}</h3>
        <p className="text-sm text-gray-600 mb-2">by {creatorName}</p>
        <p className="text-xs text-gray-500 mb-4">{usageCount} videos</p>
        <button className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 rounded text-sm">
          Use Effect
        </button>
      </div>
    </div>
  );
};
