import React from 'react';

interface TwitchProfileProps {
  bannerImage?: string;
  profileImage?: string;
  username?: string;
  bio?: string;
  followers?: string;
}

export const TwitchProfile: React.FC<TwitchProfileProps> = ({
  bannerImage = '',
  profileImage = '',
  username = 'StreamerName',
  bio = 'Streamer bio goes here',
  followers = '12.4K',
}) => {
  return (
    <div className="w-full max-w-[800px] bg-[#18181B] rounded-lg overflow-hidden shadow-lg">
      <div className="relative w-full h-[200px] bg-gradient-to-r from-purple-900 to-purple-600">
        {bannerImage && <img src={bannerImage} alt="Banner" className="w-full h-full object-cover" />}
      </div>
      
      <div className="relative px-6 pb-6">
        <div className="absolute -top-12 left-6">
          <div className="w-24 h-24 rounded-full border-4 border-[#18181B] bg-purple-600 overflow-hidden">
            {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
          </div>
        </div>
        
        <div className="pt-16">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">{username}</h1>
              <p className="text-sm text-gray-400">{followers} followers</p>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded">
              Follow
            </button>
          </div>
          <p className="text-sm text-gray-300">{bio}</p>
        </div>
      </div>
    </div>
  );
};
