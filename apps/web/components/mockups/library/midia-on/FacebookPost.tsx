import React from 'react';

interface FacebookPostProps {
  username?: string;
  profileImage?: string;
  timeAgo?: string;
  postText?: string;
  content?: string;
  text?: string;
  body?: string;
  postImage?: string;
  thumbnail?: string;
  likes?: number;
  comments?: number;
  shares?: number;
}

export const FacebookPost: React.FC<FacebookPostProps> = ({
  username = 'Username',
  profileImage = '',
  timeAgo = '2h',
  postText = 'This is an example post text that can be customized.',
  content,
  text,
  body,
  postImage = '',
  thumbnail,
  likes = 142,
  comments = 23,
  shares = 5,
}) => {
  const resolvedPostText = content ?? text ?? body ?? postText;
  const resolvedPostImage = thumbnail ?? postImage;

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
        <p className="text-sm text-gray-900">{resolvedPostText}</p>
      </div>

      {/* Image */}
      {resolvedPostImage && (
        <div className="w-full">
          <img src={resolvedPostImage} alt="Post" className="w-full object-cover" />
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span className="text-sm font-medium">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-sm font-medium">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 py-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          <span className="text-sm font-medium">Share</span>
        </button>
      </div>
    </div>
  );
};
