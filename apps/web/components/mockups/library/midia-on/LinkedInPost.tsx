import React from 'react';

interface LinkedInPostProps {
  name?: string;
  username?: string;
  headline?: string;
  title?: string;
  subtitle?: string;
  description?: string;
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
}

export const LinkedInPost: React.FC<LinkedInPostProps> = ({
  name = 'Full Name',
  username,
  headline = 'Professional Title at Company',
  title,
  subtitle,
  description,
  profileImage = '',
  timeAgo = '2h',
  postText = 'This is a professional post about industry insights or achievements.',
  content,
  text,
  body,
  postImage = '',
  thumbnail,
  likes = 87,
  comments = 12,
}) => {
  const resolvedName = username ?? name;
  const resolvedHeadline = title ?? subtitle ?? description ?? headline;
  const resolvedPostText = content ?? text ?? body ?? postText;
  const resolvedPostImage = thumbnail ?? postImage;

  return (
    <div className="w-full max-w-[552px] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
          {profileImage && (
            <img src={profileImage} alt={resolvedName} className="w-full h-full object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900">{resolvedName}</p>
          <p className="text-xs text-gray-600 line-clamp-1">{resolvedHeadline}</p>
          <p className="text-xs text-gray-500 mt-0.5">{timeAgo} • 🌐</p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{resolvedPostText}</p>
      </div>

      {/* Image */}
      {resolvedPostImage && (
        <div className="w-full">
          <img src={resolvedPostImage} alt="Post" className="w-full object-cover" />
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
        <span>{likes} reactions • {comments} comments</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-around px-2 py-1">
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          <span className="text-sm font-semibold">Like</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-sm font-semibold">Comment</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
          <span className="text-sm font-semibold">Repost</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:bg-gray-50 py-3 px-4 rounded-md flex-1 justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          <span className="text-sm font-semibold">Send</span>
        </button>
      </div>
    </div>
  );
};
