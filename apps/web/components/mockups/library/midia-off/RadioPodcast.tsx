import React from 'react';

interface RadioPodcastProps {
  brandName?: string;
  title?: string;
  headline?: string;
  name?: string;
  message?: string;
  text?: string;
  body?: string;
  caption?: string;
  content?: string;
  voiceType?: string;
}

export const RadioPodcast: React.FC<RadioPodcastProps> = ({
  brandName,
  title,
  headline,
  name,
  message,
  text,
  body,
  caption,
  content,
  voiceType = 'Male Voice',
}) => {
  const resolvedBrandName = brandName ?? title ?? headline ?? name ?? 'Brand Name';
  const resolvedMessage = message ?? text ?? body ?? caption ?? content ?? 'Your radio message here';
  return (
    <div className="w-full max-w-[500px] bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg shadow-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/></svg>
        </div>
        <div className="flex-1 text-white">
          <h3 className="text-lg font-bold">Rádio Podcast Patrocinado</h3>
          <p className="text-sm opacity-90">{resolvedBrandName}</p>
        </div>
        <div className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
          300"
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
        <p className="text-white text-sm leading-relaxed">{resolvedMessage}</p>
      </div>

      <div className="flex items-center justify-between text-white text-xs">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          <span>{voiceType}</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          <span>Audio Spot</span>
        </div>
      </div>
    </div>
  );
};
