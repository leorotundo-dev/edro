import React from 'react';

interface FacebookCoverProps {
  coverImage?: string;
  profileImage?: string;
  username?: string;
  bio?: string;
}

export const FacebookCover: React.FC<FacebookCoverProps> = ({
  coverImage = '',
  profileImage = '',
  username = 'Username',
  bio = 'Bio text goes here',
}) => {
  return (
    <div className="w-full max-w-[800px] bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Cover Photo */}
      <div className="relative w-full h-[280px] bg-gray-200">
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
              <img src={profileImage} alt={username} className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pt-20">
          <h1 className="text-2xl font-bold text-gray-900">{username}</h1>
          <p className="text-sm text-gray-600 mt-1">{bio}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-4 border-t border-gray-200 pt-2">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">
            Posts
          </button>
          <button className="text-sm font-semibold text-gray-600 pb-2">About</button>
          <button className="text-sm font-semibold text-gray-600 pb-2">Friends</button>
          <button className="text-sm font-semibold text-gray-600 pb-2">Photos</button>
        </div>
      </div>
    </div>
  );
};
