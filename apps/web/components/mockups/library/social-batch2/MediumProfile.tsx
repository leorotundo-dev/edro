import React from 'react';

interface MediumProfileProps {
  profileImage?: string;
  name?: string;
  bio?: string;
  followers?: string;
}

export const MediumProfile: React.FC<MediumProfileProps> = ({
  profileImage = '',
  name = 'Author Name',
  bio = 'Writer, thinker, creator',
  followers = '1.2K',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      <div className="flex items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && <img src={profileImage} alt={name} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{name}</h2>
          <p className="text-base text-gray-600 mb-3">{bio}</p>
          <p className="text-sm text-gray-500 mb-4">{followers} Followers</p>
          <button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-full text-sm">
            Follow
          </button>
        </div>
      </div>
    </div>
  );
};
