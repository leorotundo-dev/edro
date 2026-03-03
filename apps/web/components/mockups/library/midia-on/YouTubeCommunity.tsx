import React from 'react';

interface YouTubeCommunityProps {
  channelName?: string;
  channelImage?: string;
  postText?: string;
  content?: string;
  text?: string;
  body?: string;
  postImage?: string;
  thumbnail?: string;
  likes?: number;
  comments?: number;
  timeAgo?: string;
}

export const YouTubeCommunity: React.FC<YouTubeCommunityProps> = ({
  channelName = 'Channel Name',
  channelImage = '',
  postText = 'Community post text goes here. Share updates with your subscribers!',
  content,
  text,
  body,
  postImage = '',
  thumbnail,
  likes = 2400,
  comments = 156,
  timeAgo = '1 day ago',
}) => {
  const resolvedPostText = content ?? text ?? body ?? postText;
  const resolvedPostImage = thumbnail ?? postImage;

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
          <p className="text-sm text-gray-900 mt-2">{resolvedPostText}</p>
          {resolvedPostImage && (
            <div className="mt-3 rounded-lg overflow-hidden">
              <img src={resolvedPostImage} alt="Post" className="w-full object-cover" />
            </div>
          )}
          <div className="flex items-center gap-6 mt-4">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              <span className="text-sm">{likes.toLocaleString()}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm">{comments}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
