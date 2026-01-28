import React from 'react';
import { ThumbsUp, MessageCircle, Repeat2, Send } from 'lucide-react';

interface LinkedInPostProps {
  name?: string;
  headline?: string;
  profileImage?: string;
  timeAgo?: string;
  postText?: string;
  postImage?: string;
  likes?: number;
  comments?: number;
}

export const LinkedInPost: React.FC<LinkedInPostProps> = ({
  name = 'Full Name',
  headline = 'Professional Title at Company',
  profileImage = '',
  timeAgo = '2h',
  postText = 'This is a professional post about industry insights or achievements.',
  postImage = '',
  likes = 87,
  comments = 12,
}) => {
  return (
    <div className="w-full max-w-[552px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && (
            <img src={profileImage} alt={name} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{name}</p>
          <p className="text-xs text-gray-600 line-clamp-1">{headline}</p>
          <p className="text-xs text-gray-500 mt-0.5">{timeAgo} • 🌐</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{postText}</p>
      </div>

      {/* Image */}
      {postImage && (
        <div className="w-full">
          <img src={postImage} alt="Post" className="w-full object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
        <span>{likes} reactions • {comments} comments</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-2 py-1">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <ThumbsUp className="w-5 h-5" />
          <span className="text-sm font-semibold">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm font-semibold">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <Send className="w-5 h-5" />
          <span className="text-sm font-semibold">Send</span>
        </button>
      </div>
    </div>
  );
};
