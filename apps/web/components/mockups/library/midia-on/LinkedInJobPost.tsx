import React from 'react';
import { Briefcase, MapPin, Users, Clock } from 'lucide-react';

interface LinkedInJobPostProps {
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  location?: string;
  jobType?: string;
  applicants?: number;
  postedTime?: string;
}

export const LinkedInJobPost: React.FC<LinkedInJobPostProps> = ({
  jobTitle = 'Job Title',
  companyName = 'Company Name',
  companyLogo = '',
  location = 'City, Country',
  jobType = 'Full-time',
  applicants = 47,
  postedTime = '2 days ago',
}) => {
  return (
    <div className="w-full max-w-[700px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded bg-gray-200 overflow-hidden flex-shrink-0">
          {companyLogo && <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{jobTitle}</h3>
          <p className="text-sm text-gray-700 mb-2">{companyName}</p>
          
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>{location}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Briefcase className="w-4 h-4" />
              <span>{jobType}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{applicants} applicants</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
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
