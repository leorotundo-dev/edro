import React from 'react';
import { Heart, MessageCircle, Repeat2, Send } from 'lucide-react';

interface ThreadsPostProps {
  username?: string;
  profileImage?: string;
  postText?: string;
  postImage?: string;
  timeAgo?: string;
  likes?: number;
  replies?: number;
}

export const ThreadsPost: React.FC<ThreadsPostProps> = ({
  username = 'username',
  profileImage = '',
  postText = 'This is a Threads post',
  postImage = '',
  timeAgo = '2h',
  likes = 234,
  replies = 12,
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border-b border-gray-200 p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && <img src={profileImage} alt={username} className="w-full h-full object-cover" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-gray-900">{username}</span>
            <span className="text-sm text-gray-500">{timeAgo}</span>
          </div>
          
          <p className="text-sm text-gray-900 mb-2">{postText}</p>
          
          {postImage && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img src={postImage} alt="Post" className="w-full object-cover max-h-[400px]" />
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <Heart className="w-5 h-5" />
              <span className="text-sm">{likes}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{replies}</span>
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <Repeat2 className="w-5 h-5" />
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
