import React from 'react';

interface TwitterThreadProps {
  username?: string;
  handle?: string;
  profileImage?: string;
  tweets?: string[];
}

export const TwitterThread: React.FC<TwitterThreadProps> = ({
  username = 'Username',
  handle = '@username',
  profileImage = '',
  tweets = [
    'First tweet in the thread...',
    'Second tweet continues the story...',
    'Third tweet wraps it up.'
  ],
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border-b border-gray-200">
      {tweets.map((tweet, index) => (
        <div key={index} className="relative p-4 hover:bg-gray-50">
          <div className="flex gap-3">
            {/* Profile Image */}
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                {profileImage && (
                  <img src={profileImage} alt={username} className="w-full h-full object-cover" />
                )}
              </div>
              {/* Thread Line */}
              {index < tweets.length - 1 && (
                <div className="absolute top-14 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-300" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm text-gray-900">{username}</span>
                <span className="text-sm text-gray-500">{handle}</span>
                <span className="text-gray-500">·</span>
                <span className="text-sm text-gray-500">2h</span>
              </div>

              {/* Tweet Text */}
              <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{tweet}</p>

              {/* Thread Indicator */}
              {index === 0 && (
                <p className="text-sm text-gray-500 mt-2">Show this thread</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
