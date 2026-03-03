import React from 'react';

interface TwitterPostProps {
  username?: string;
  handle?: string;
  profileImage?: string;
  tweetText?: string;
  content?: string;
  text?: string;
  body?: string;
  tweetImage?: string;
  postImage?: string;
  thumbnail?: string;
  replies?: number;
  retweets?: number;
  likes?: number;
}

export const TwitterPost: React.FC<TwitterPostProps> = ({
  username = 'Username',
  handle = '@username',
  profileImage = '',
  tweetText = 'This is an example tweet that can contain text, links, and hashtags.',
  content,
  text,
  body,
  tweetImage = '',
  postImage,
  thumbnail,
  replies = 12,
  retweets = 34,
  likes = 156,
}) => {
  const resolvedTweetText = content ?? text ?? body ?? tweetText;
  const resolvedTweetImage = postImage ?? thumbnail ?? tweetImage;

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
          <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{resolvedTweetText}</p>

          {/* Tweet Image */}
          {resolvedTweetImage && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-gray-200">
              <img src={resolvedTweetImage} alt="Tweet" className="w-full object-cover" />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-3 max-w-md">
            <button className="flex items-center gap-2 text-gray-500 hover:text-blue-500 group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span className="text-sm">{replies}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 9 3-3 3 3"/><path d="M13 18H7a2 2 0 0 1-2-2V6"/><path d="m22 15-3 3-3-3"/><path d="M11 6h6a2 2 0 0 1 2 2v10"/></svg>
              <span className="text-sm">{retweets}</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 group">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-sm">{likes}</span>
            </button>
            <button className="text-gray-500 hover:text-blue-500">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
