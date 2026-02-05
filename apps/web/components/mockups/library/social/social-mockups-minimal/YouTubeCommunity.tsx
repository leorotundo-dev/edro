import React from 'react';
import { ThumbsUp, MessageCircle } from 'lucide-react';

interface YouTubeCommunityProps {
  channelName?: string;
  channelImage?: string;
  postText?: string;
  postImage?: string;
  likes?: number;
  comments?: number;
  timeAgo?: string;
}

export const YouTubeCommunity: React.FC<YouTubeCommunityProps> = ({
  channelName = 'Channel Name',
  channelImage = '',
  postText = 'Community post text goes here. Share updates with your subscribers!',
  postImage = '',
  likes = 2400,
  comments = 156,
  timeAgo = '1 day ago',
}) => {
  return (
    <div className="w-full max-w-[700px] bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {channelImage && <img src={channelImage} alt={channelName} className="w-full h-full object-cover" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-gray-900">{channelName}</span>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>
          <p className="text-sm text-gray-900 mt-2">{postText}</p>
          {postImage && (
            <div className="mt-3 rounded-lg overflow-hidden">
              <img src={postImage} alt="Post" className="w-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-6 mt-4">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ThumbsUp className="w-5 h-5" />
              <span className="text-sm">{likes.toLocaleString()}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{comments}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
