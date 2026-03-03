import React from 'react';

interface LinkedInNewsletterProps {
  newsletterImage?: string;
  postImage?: string;
  thumbnail?: string;
  newsletterName?: string;
  title?: string;
  headline?: string;
  name?: string;
  description?: string;
  subtitle?: string;
  subscriberCount?: string;
  authorName?: string;
}

export const LinkedInNewsletter: React.FC<LinkedInNewsletterProps> = ({
  newsletterImage = '',
  postImage,
  thumbnail,
  newsletterName = 'Newsletter Name',
  title,
  headline,
  name,
  description = 'Weekly insights on industry trends and best practices',
  subtitle,
  subscriberCount = '12.4K',
  authorName = 'Author Name',
}) => {
  const resolvedNewsletterImage = postImage ?? thumbnail ?? newsletterImage;
  const resolvedNewsletterName = title ?? headline ?? name ?? newsletterName;
  const resolvedDescription = subtitle ?? description;

  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="w-full h-[150px] bg-gray-200 relative">
        {resolvedNewsletterImage && <img src={resolvedNewsletterImage} alt={resolvedNewsletterName} className="w-full h-full object-cover" />}
        <div className="absolute top-3 left-3 bg-blue-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs font-semibold">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          Newsletter
        </div>
      </div>

      <div className="p-4">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{resolvedNewsletterName}</h3>
        <p className="text-sm text-gray-600 mb-3">{resolvedDescription}</p>
        <p className="text-xs text-gray-500 mb-4">{subscriberCount} subscribers • by {authorName}</p>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded text-sm">
          Subscribe
        </button>
      </div>
    </div>
  );
};
