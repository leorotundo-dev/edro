import React from 'react';

interface DribbbleProfileProps {
  profileImage?: string;
  name?: string;
  bio?: string;
  location?: string;
  followers?: string;
}

export const DribbbleProfile: React.FC<DribbbleProfileProps> = ({
  profileImage = '',
  name = 'Designer Name',
  bio = 'Product Designer & Illustrator',
  location = 'City, Country',
  followers = '12.4K',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="flex items-start gap-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && <img src={profileImage} alt={name} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-1">{name}</h2>
          <p className="text-base text-gray-600 mb-1">{bio}</p>
          <p className="text-sm text-gray-500 mb-4">{location}</p>
          <p className="text-sm text-gray-600 mb-4">{followers} Followers</p>
          <button className="bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-6 rounded text-sm">
            Follow
          </button>
        </div>
      </div>
    </div>
  );
};
