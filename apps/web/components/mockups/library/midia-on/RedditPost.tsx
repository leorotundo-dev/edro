import React from 'react';
import { ArrowUp, ArrowDown, MessageSquare, Share2 } from 'lucide-react';

interface RedditPostProps {
  subreddit?: string;
  username?: string;
  timeAgo?: string;
  title?: string;
  postText?: string;
  postImage?: string;
  upvotes?: number;
  comments?: number;
}

export const RedditPost: React.FC<RedditPostProps> = ({
  subreddit = 'r/subreddit',
  username = 'u/username',
  timeAgo = '2h ago',
  title = 'Post Title Goes Here',
  postText = 'Post content text goes here. This is the body of the Reddit post.',
  postImage = '',
  upvotes = 1234,
  comments = 89,
}) => {
  return (
    <div className="w-full max-w-[700px] bg-white border border-gray-300 rounded hover:border-gray-400">
      <div className="flex">
        <div className="flex flex-col items-center bg-gray-50 p-2 rounded-l">
          <button className="text-gray-400 hover:text-orange-500 p-1">
            <ArrowUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold text-gray-900 my-1">{upvotes}</span>
          <button className="text-gray-400 hover:text-blue-500 p-1">
            <ArrowDown className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 p-2">
          <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
            <span className="font-bold text-gray-900">{subreddit}</span>
            <span>•</span>
            <span>Posted by {username}</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          {postText && <p className="text-sm text-gray-800 mb-2">{postText}</p>}
          {postImage && (
            <div className="mb-2 rounded overflow-hidden">
              <img src={postImage} alt="Post" className="w-full object-cover max-h-[400px]" />
            </div>
          )}
          <div className="flex items-center gap-4 mt-2">
            <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded text-xs font-bold">
              <MessageSquare className="w-4 h-4" />
              {comments} Comments
            </button>
            <button className="flex items-center gap-1 text-gray-600 hover:bg-gray-100 px-2 py-1 rounded text-xs font-bold">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
