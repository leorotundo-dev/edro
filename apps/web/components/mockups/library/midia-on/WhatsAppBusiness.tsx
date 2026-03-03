import React from 'react';

interface WhatsAppBusinessProps {
  businessName?: string;
  title?: string;
  headline?: string;
  name?: string;
  businessLogo?: string;
  category?: string;
  description?: string;
  subtitle?: string;
  content?: string;
  address?: string;
  hours?: string;
  website?: string;
}

export const WhatsAppBusiness: React.FC<WhatsAppBusinessProps> = ({
  businessName = 'Business Name',
  title,
  headline,
  name,
  businessLogo = '',
  category = 'Retail',
  description = 'Business description goes here',
  subtitle,
  content,
  address = '123 Street, City',
  hours = 'Mon-Fri 9AM-6PM',
  website = 'www.business.com',
}) => {
  const resolvedBusinessName = title ?? headline ?? name ?? businessName;
  const resolvedDescription = subtitle ?? content ?? description;

  return (
    <div className="w-full max-w-[400px] bg-white rounded-lg shadow-sm">
      <div className="bg-[#075E54] p-4 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-white overflow-hidden mb-3">
          {businessLogo && <img src={businessLogo} alt={resolvedBusinessName} className="w-full h-full object-cover" />}
        </div>
        <h2 className="text-white font-bold text-lg">{resolvedBusinessName}</h2>
        <p className="text-white/80 text-sm">{category}</p>
      </div>
      <div className="p-4 space-y-4">
        <p className="text-sm text-gray-900">{resolvedDescription}</p>
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <p className="text-sm text-gray-900">{address}</p>
          </div>
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p className="text-sm text-gray-900">{hours}</p>
          </div>
          <div className="flex items-start gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 flex-shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <p className="text-sm text-blue-600">{website}</p>
          </div>
        </div>
        <button className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3 rounded-lg">
          Message
        </button>
      </div>
    </div>
  );
};
