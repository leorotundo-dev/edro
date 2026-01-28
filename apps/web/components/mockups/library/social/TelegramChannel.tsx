import React from 'react';

interface TelegramChannelProps {
  channelName?: string;
  channelImage?: string;
  subscribers?: string;
  postText?: string;
  postImage?: string;
  views?: string;
}

export const TelegramChannel: React.FC<TelegramChannelProps> = ({
  channelName = 'Channel Name',
  channelImage = '',
  subscribers = '12.4K subscribers',
  postText = 'Channel post content goes here',
  postImage = '',
  views = '2.3K views',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-[#0E1621] rounded-lg overflow-hidden shadow-sm">
      <div className="bg-[#212D3B] p-4 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gray-600 overflow-hidden mb-3">
          {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
        </div>
        <h2 className="text-white font-bold text-lg">{channelName}</h2>
        <p className="text-gray-400 text-sm mt-1">{subscribers}</p>
      </div>
      <div className="p-4">
        <div className="bg-[#212D3B] rounded-lg p-3">
          {postImage && (
            <div className="mb-3 rounded overflow-hidden">
              <img src={postImage} alt="Post" className="w-full object-cover" />
            </div>
          )}
          <p className="text-sm text-white mb-2">{postText}</p>
          <p className="text-xs text-gray-400">{views}</p>
        </div>
      </div>
    </div>
  );
};
