import React from 'react';
import { MessageCircle, Repeat2, Heart, Share } from 'lucide-react';

interface TwitterPostProps {
  username?: string;
  handle?: string;
  profileImage?: string;
  tweetText?: string;
  tweetImage?: string;
  replies?: number;
  retweets?: number;
  likes?: number;
}

export const TwitterPost: React.FC<TwitterPostProps> = ({
  username = 'Username',
  handle = '@username',
  profileImage = '',
  tweetText = 'This is an example tweet that can contain text, links, and hashtags.',
  tweetImage = '',
  replies = 12,
  retweets = 34,
  likes = 156,
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border-b border-gray-200 p-4 hover:bg-gray-50">
      <div className="flex gap-3">
        {/* Profile Image */}
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && (
            <img src={profileImage} alt={username} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-gray-900">{username}</span>
            <span className="text-sm text-gray-500">{handle}</span>
            <span className="text-gray-500">·</span>
            <span className="text-sm text-gray-500">2h</span>
          </div>

          {/* Tweet Text */}
          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{tweetText}</p>

          {/* Tweet Image */}
          {tweetImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <img src={tweetImage} alt="Tweet" className="w-full object-cover" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 max-w-md">
            <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 group">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{replies}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 group">
              <Repeat2 className="w-5 h-5" />
              <span className="text-sm">{retweets}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 group">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{likes}</span>
            </button>
            <button className="text-gray-500 hover:text-blue-500">
              <Share className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
