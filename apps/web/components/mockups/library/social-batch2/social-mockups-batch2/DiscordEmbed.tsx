import React from 'react';

interface DiscordEmbedProps {
  title?: string;
  description?: string;
  embedImage?: string;
  color?: string;
  author?: string;
}

export const DiscordEmbed: React.FC<DiscordEmbedProps> = ({
  title = 'Embed Title',
  description = 'Embed description text goes here',
  embedImage = '',
  color = '#5865F2',
  author = 'Bot Name',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-[#313338] rounded-lg p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold text-sm text-white">{author}</span>
            <span className="text-xs bg-indigo-600 text-white px-1.5 py-0.5 rounded">BOT</span>
            <span className="text-xs text-gray-400">Today at 10:30 AM</span>
          </div>
          
          <div className="border-l-4 pl-3 py-2" style={{ borderColor: color }}>
            <h4 className="font-semibold text-sm text-white mb-1">{title}</h4>
            <p className="text-sm text-gray-300 mb-2">{description}</p>
            {embedImage && (
              <div className="rounded overflow-hidden max-w-[400px]">
                <img src={embedImage} alt="Embed" className="w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
