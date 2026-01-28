import React from 'react';

interface PollOption {
  text: string;
  percentage: number;
}

interface LinkedInPollProps {
  username?: string;
  profileImage?: string;
  question?: string;
  options?: PollOption[];
  totalVotes?: number;
  timeLeft?: string;
}

export const LinkedInPoll: React.FC<LinkedInPollProps> = ({
  username = 'Professional Name',
  profileImage = '',
  question = "What's your biggest challenge in 2026?",
  options = [
    { text: 'Remote work', percentage: 35 },
    { text: 'Work-life balance', percentage: 45 },
    { text: 'Career growth', percentage: 20 },
  ],
  totalVotes = 287,
  timeLeft = '3 days left',
}) => {
  return (
    <div className="w-full max-w-[550px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{username}</p>
          <p className="text-xs text-gray-500">Posted a poll</p>
        </div>
      </div>
      
      <p className="font-semibold text-base text-gray-900 mb-4">{question}</p>
      
      <div className="space-y-3 mb-3">
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
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{totalVotes} votes</span>
        <span>{timeLeft}</span>
      </div>
    </div>
  );
};
