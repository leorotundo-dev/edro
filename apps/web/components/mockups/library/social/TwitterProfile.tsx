import React from 'react';

interface TwitterProfileProps {
  coverImage?: string;
  profileImage?: string;
  username?: string;
  handle?: string;
  bio?: string;
  following?: number;
  followers?: number;
}

export const TwitterProfile: React.FC<TwitterProfileProps> = ({
  coverImage = '',
  profileImage = '',
  username = 'Username',
  handle = '@username',
  bio = 'Bio text goes here',
  following = 234,
  followers = 1523,
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white">
      <div className="w-full h-[200px] bg-gray-200">
        {coverImage && <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />}
      </div>
      <div className="relative px-4 pb-4">
        <div className="absolute -top-16 left-4">
          <div className="w-32 h-32 rounded-full border-4 border-white bg-gray-200 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
        </div>
        <div className="flex justify-end pt-3">
          <button className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-6 rounded-full text-sm">Follow</button>
        </div>
        <div className="mt-4">
          <h1 className="text-xl font-bold text-gray-900">{username}</h1>
          <p className="text-sm text-gray-500">{handle}</p>
          <p className="text-sm text-gray-900 mt-3">{bio}</p>
          <div className="flex gap-4 mt-3">
            <div><span className="font-bold text-sm">{following}</span><span className="text-sm text-gray-500 ml-1">Following</span></div>
            <div><span className="font-bold text-sm">{followers}</span><span className="text-sm text-gray-500 ml-1">Followers</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};
