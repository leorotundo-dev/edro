import React from 'react';

interface TikTokProfileProps {
  profileImage?: string;
  username?: string;
  name?: string;
  bio?: string;
  following?: string;
  followers?: string;
  likes?: string;
  gridVideos?: string[];
}

export const TikTokProfile: React.FC<TikTokProfileProps> = ({
  profileImage = '',
  username = '@username',
  name = 'Display Name',
  bio = 'Bio goes here',
  following = '234',
  followers = '12.4K',
  likes = '89.2K',
  gridVideos = ['', '', '', '', '', ''],
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white">
      <div className="flex flex-col items-center p-6">
        <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
          {profileImage && <img src={profileImage} alt={name} className="w-full h-full object-cover" />}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mt-4">{username}</h1>
        <p className="text-sm text-gray-600">{name}</p>
        <div className="flex gap-6 mt-4">
          <div className="text-center"><span className="font-bold text-base">{following}</span><p className="text-xs text-gray-600">Following</p></div>
          <div className="text-center"><span className="font-bold text-base">{followers}</span><p className="text-xs text-gray-600">Followers</p></div>
          <div className="text-center"><span className="font-bold text-base">{likes}</span><p className="text-xs text-gray-600">Likes</p></div>
        </div>
        <p className="text-sm text-gray-900 text-center mt-4">{bio}</p>
        <button className="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-12 rounded-md">Follow</button>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {gridVideos.map((video, i) => (
          <div key={i} className="aspect-[9/16] bg-gray-200">
            {video && <img src={video} alt={`Video ${i+1}`} className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
    </div>
  );
};
