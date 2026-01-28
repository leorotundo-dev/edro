import React from 'react';
import { Mail } from 'lucide-react';

interface LinkedInNewsletterProps {
  newsletterImage?: string;
  newsletterName?: string;
  description?: string;
  subscriberCount?: string;
  authorName?: string;
}

export const LinkedInNewsletter: React.FC<LinkedInNewsletterProps> = ({
  newsletterImage = '',
  newsletterName = 'Newsletter Name',
  description = 'Weekly insights on industry trends and best practices',
  subscriberCount = '12.4K',
  authorName = 'Author Name',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[150px] bg-gray-200 relative">
        {newsletterImage && <img src={newsletterImage} alt={newsletterName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold">
          <Mail className="w-3 h-3" />
          Newsletter
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{newsletterName}</h3>
        <p className="text-sm text-gray-600 mb-3">{description}</p>
        <p className="text-xs text-gray-500 mb-4">{subscriberCount} subscribers • by {authorName}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Subscribe
        </button>
      </div>
    </div>
  );
};
