import React from 'react';

interface PollOption {
  text: string;
  percentage: number;
}

interface TwitterPollProps {
  username?: string;
  handle?: string;
  profileImage?: string;
  question?: string;
  options?: PollOption[];
  totalVotes?: number;
  timeLeft?: string;
}

export const TwitterPoll: React.FC<TwitterPollProps> = ({
  username = 'Username',
  handle = '@handle',
  profileImage = '',
  question = "What's your favorite feature?",
  options = [
    { text: 'Option A', percentage: 45 },
    { text: 'Option B', percentage: 35 },
    { text: 'Option C', percentage: 20 },
  ],
  totalVotes = 1234,
  timeLeft = '2 days left',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-2xl p-4">
      <div className="flex gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-1">
            <span className="font-bold text-sm text-gray-900">{username}</span>
            <span className="text-sm text-gray-500">{handle}</span>
          </div>
          
          <p className="text-sm text-gray-900 mb-3">{question}</p>
          
          <div className="space-y-2 mb-3">
            {options.map((option, i) => (
              <div key={i} className="relative">
                <div className="w-full bg-gray-100 rounded p-3 overflow-hidden cursor-pointer hover:bg-gray-200">
                  <div 
                    className="absolute inset-0 bg-blue-100 rounded transition-all"
                    style={{ width: `${option.percentage}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">{option.text}</span>
                    <span className="text-sm font-semibold text-gray-900">{option.percentage}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-gray-500">{totalVotes.toLocaleString()} votes • {timeLeft}</p>
        </div>
      </div>
    </div>
  );
};
