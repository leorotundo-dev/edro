import React from 'react';

interface LinkedInJobPostProps {
  jobTitle?: string;
  title?: string;
  headline?: string;
  name?: string;
  companyName?: string;
  companyLogo?: string;
  location?: string;
  jobType?: string;
  applicants?: number;
  postedTime?: string;
}

export const LinkedInJobPost: React.FC<LinkedInJobPostProps> = ({
  jobTitle = 'Job Title',
  title,
  headline,
  name,
  companyName = 'Company Name',
  companyLogo = '',
  location = 'City, Country',
  jobType = 'Full-time',
  applicants = 47,
  postedTime = '2 days ago',
}) => {
  const resolvedJobTitle = title ?? headline ?? name ?? jobTitle;

  return (
    <div className="w-full max-w-[700px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded bg-gray-200 overflow-hidden flex-shrink-0">
          {companyLogo && <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{resolvedJobTitle}</h3>
          <p className="text-sm text-gray-700 mb-2">{companyName}</p>

          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
              <span>{jobType}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>{applicants} applicants</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <span>{postedTime}</span>
            </div>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full text-sm">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
