import React from 'react';

interface PollOption {
  text: string;
  percentage: number;
}

interface FacebookPollProps {
  username?: string;
  profileImage?: string;
  question?: string;
  options?: PollOption[];
  totalVotes?: number;
}

export const FacebookPoll: React.FC<FacebookPollProps> = ({
  username = 'Username',
  profileImage = '',
  question = 'Poll question?',
  options = [
    { text: 'Option 1', percentage: 60 },
    { text: 'Option 2', percentage: 40 },
  ],
  totalVotes = 150,
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        <span className="font-semibold text-sm text-gray-900">{username}</span>
      </div>
      
      <p className="font-semibold text-base text-gray-900 mb-3">{question}</p>
      
      <div className="space-y-2 mb-3">
        {options.map((option, i) => (
          <div key={i} className="relative">
            <div className="w-full bg-gray-100 rounded-lg p-3 overflow-hidden">
              <div 
                className="absolute inset-0 bg-blue-100 rounded-lg transition-all"
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
      
      <p className="text-xs text-gray-500">{totalVotes} votes</p>
    </div>
  );
};
