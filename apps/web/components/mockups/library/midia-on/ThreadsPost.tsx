import React from 'react';

interface ThreadsPostProps {
  username?: string;
  profileImage?: string;
  postText?: string;
  content?: string;
  text?: string;
  body?: string;
  postImage?: string;
  thumbnail?: string;
  timeAgo?: string;
  likes?: number;
  replies?: number;
}

export const ThreadsPost: React.FC<ThreadsPostProps> = ({
  username = 'username',
  profileImage = '',
  postText = 'This is a Threads post',
  content,
  text,
  body,
  postImage = '',
  thumbnail,
  timeAgo = '2h',
  likes = 234,
  replies = 12,
}) => {
  const resolvedPostText = content ?? text ?? body ?? postText;
  const resolvedPostImage = thumbnail ?? postImage;

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

          <p className="text-sm text-gray-900 mb-2">{resolvedPostText}</p>

          {resolvedPostImage && (
            <div className="mb-3 rounded-lg overflow-hidden">
              <img src={resolvedPostImage} alt="Post" className="w-full object-cover max-h-[400px]" />
            </div>
          )}

          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-sm">{likes}</span>
            </button>
            <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm">{replies}</span>
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
            </button>
            <button className="text-gray-600 hover:text-gray-900">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
