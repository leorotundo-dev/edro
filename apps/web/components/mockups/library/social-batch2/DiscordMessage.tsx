import React from 'react';

interface DiscordMessageProps {
  username?: string;
  userAvatar?: string;
  message?: string;
  timestamp?: string;
  userColor?: string;
}

export const DiscordMessage: React.FC<DiscordMessageProps> = ({
  username = 'Username',
  userAvatar = '',
  message = 'This is a Discord message',
  timestamp = 'Today at 10:30 AM',
  userColor = '#5865F2',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-[#313338] rounded-lg p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden flex-shrink-0">
          {userAvatar && <img src={userAvatar} alt={username} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm" style={{ color: userColor }}>
              {username}
            </span>
            <span className="text-xs text-gray-400">{timestamp}</span>
          </div>
          <p className="text-sm text-gray-200">{message}</p>
        </div>
      </div>
    </div>
  );
};
