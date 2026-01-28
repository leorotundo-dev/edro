import React from 'react';

interface LinkedInProfileProps {
  coverImage?: string;
  profileImage?: string;
  name?: string;
  headline?: string;
  location?: string;
  connections?: number;
}

export const LinkedInProfile: React.FC<LinkedInProfileProps> = ({
  coverImage = '',
  profileImage = '',
  name = 'Full Name',
  headline = 'Professional Title at Company',
  location = 'City, Country',
  connections = 500,
}) => {
  return (
    <div className="w-full max-w-[800px] bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Cover Image */}
      <div className="relative w-full h-[200px] bg-gray-200">
        {coverImage && (
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Profile Section */}
      <div className="relative px-6 pb-6">
        {/* Profile Picture */}
        <div className="absolute -top-16 left-6">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
            {profileImage && (
              <img src={profileImage} alt={name} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pt-20">
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-base text-gray-700 mt-1">{headline}</p>
          <p className="text-sm text-gray-500 mt-2">{location}</p>
          <p className="text-sm text-blue-600 font-semibold mt-1">
            {connections}+ connections
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-full text-sm">
            Connect
          </button>
          <button className="border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2 px-6 rounded-full text-sm">
            Message
          </button>
        </div>
      </div>
    </div>
  );
};
