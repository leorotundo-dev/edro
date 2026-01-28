import React from 'react';
import { ThumbsUp, MessageCircle, Share2 } from 'lucide-react';

interface FacebookPostProps {
  username?: string;
  profileImage?: string;
  timeAgo?: string;
  postText?: string;
  postImage?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

export const FacebookPost: React.FC<FacebookPostProps> = ({
  username = 'Username',
  profileImage = '',
  timeAgo = '2h',
  postText = 'This is an example post text that can be customized.',
  postImage = '',
  likes = 142,
  comments = 23,
  shares = 5,
}) => {
  return (
    <div className="w-full max-w-[500px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
          {profileImage && (
            <img src={profileImage} alt={username} className="w-full h-full object-cover" />
          )}
        </div>
        <div>
          <p className="font-semibold text-sm text-gray-900">{username}</p>
          <p className="text-xs text-gray-500">{timeAgo}</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900">{postText}</p>
      </div>

      {/* Image */}
      {postImage && (
        <div className="w-full">
          <img src={postImage} alt="Post" className="w-full object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center justify-between px-4 py-3 text-xs text-gray-500 border-t border-gray-100">
        <span>{likes} likes</span>
        <div className="flex gap-3">
          <span>{comments} comments</span>
          <span>{shares} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-4 py-2 border-t border-gray-200">
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
          <Share2 className="w-5 h-5" />
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};
