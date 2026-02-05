import React from 'react';

interface SubstackSubscribeProps {
  publicationName?: string;
  description?: string;
  subscriberCount?: string;
}

export const SubstackSubscribe: React.FC<SubstackSubscribeProps> = ({
  publicationName = 'Publication Name',
  description = 'Weekly insights and stories delivered to your inbox',
  subscriberCount = '12.4K',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-2">{publicationName}</h3>
        <p className="text-base text-gray-600 mb-4">{description}</p>
        <p className="text-sm text-gray-500 mb-6">{subscriberCount} subscribers</p>
        
        <div className="space-y-3">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-orange-600"
            readOnly
          />
          <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg">
            Subscribe
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  );
};
