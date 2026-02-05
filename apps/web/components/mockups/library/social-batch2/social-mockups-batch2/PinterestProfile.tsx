import React from 'react';

interface PinterestProfileProps {
  profileImage?: string;
  username?: string;
  followers?: string;
  following?: string;
  bio?: string;
}

export const PinterestProfile: React.FC<PinterestProfileProps> = ({
  profileImage = '',
  username = 'Username',
  followers = '12.4K',
  following = '234',
  bio = 'Profile bio goes here',
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm p-6">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-gray-200 overflow-hidden mb-4">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">{username}</h2>
        <p className="text-sm text-gray-600 mb-4">{bio}</p>
        
        <div className="flex items-center justify-center gap-6 mb-4">
          <div className="text-center">
            <p className="font-bold text-base text-gray-900">{followers}</p>
            <p className="text-sm text-gray-600">Followers</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-base text-gray-900">{following}</p>
            <p className="text-sm text-gray-600">Following</p>
          </div>
        </div>

        <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-8 rounded-full">
          Follow
        </button>
      </div>
    </div>
  );
};
