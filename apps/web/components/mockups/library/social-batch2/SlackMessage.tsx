import React from 'react';

interface SlackMessageProps {
  username?: string;
  userAvatar?: string;
  message?: string;
  timestamp?: string;
}

export const SlackMessage: React.FC<SlackMessageProps> = ({
  username = 'Username',
  userAvatar = '',
  message = 'This is a Slack message',
  timestamp = '10:30 AM',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded bg-gray-300 overflow-hidden flex-shrink-0">
          {userAvatar && <img src={userAvatar} alt={username} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-sm text-gray-900">{username}</span>
            <span className="text-xs text-gray-500">{timestamp}</span>
          </div>
          <p className="text-sm text-gray-900">{message}</p>
        </div>
      </div>
    </div>
  );
};
