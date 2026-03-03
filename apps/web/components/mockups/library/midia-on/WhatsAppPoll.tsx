import React from 'react';

interface PollOption {
  text: string;
  votes: number;
}

interface WhatsAppPollProps {
  question?: string;
  title?: string;
  headline?: string;
  name?: string;
  options?: PollOption[];
  totalVotes?: number;
  timestamp?: string;
}

export const WhatsAppPoll: React.FC<WhatsAppPollProps> = ({
  question = 'Where should we meet?',
  title,
  headline,
  name,
  options = [
    { text: 'Coffee Shop', votes: 5 },
    { text: 'Park', votes: 3 },
    { text: 'Restaurant', votes: 7 },
  ],
  totalVotes = 15,
  timestamp = '10:30 AM',
}) => {
  const resolvedQuestion = title ?? headline ?? name ?? question;

  return (
    <div className="w-full max-w-[375px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="bg-green-100 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-700"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          <span className="font-semibold text-sm text-green-900">Poll</span>
        </div>

        <p className="font-semibold text-base text-gray-900 mb-3">{resolvedQuestion}</p>

        <div className="space-y-2 mb-3">
          {options.map((option, i) => {
            const percentage = Math.round((option.votes / totalVotes) * 100);
            return (
              <div key={i} className="bg-white rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-900">{option.text}</span>
                  <span className="text-xs text-gray-600">{option.votes}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-600 h-1.5 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-600">{totalVotes} votes</p>
      </div>

      <p className="text-xs text-gray-500 text-right mt-2">{timestamp}</p>
    </div>
  );
};
