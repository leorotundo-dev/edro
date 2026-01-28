import React from 'react';
import { Check } from 'lucide-react';

interface YouTubeMembershipProps {
  tierName?: string;
  price?: string;
  benefits?: string[];
  channelName?: string;
}

export const YouTubeMembership: React.FC<YouTubeMembershipProps> = ({
  tierName = 'Channel Member',
  price = '$4.99/month',
  benefits = ['Custom badges', 'Custom emojis', 'Members-only posts', 'Priority replies'],
  channelName = 'Channel Name',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-red-600 p-4 text-white text-center">
        <h3 className="text-xl font-bold mb-1">{tierName}</h3>
        <p className="text-2xl font-bold">{price}</p>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-600 mb-4">Join {channelName} and get access to:</p>
        
        <div className="space-y-2 mb-6">
          {benefits.map((benefit, i) => (
            <div key={i} className="flex items-start gap-2">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <span className="text-sm text-gray-900">{benefit}</span>
            </div>
          ))}
        </div>
        
        <button className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded text-sm">
          Join
        </button>
      </div>
    </div>
  );
};
