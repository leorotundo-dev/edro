import React from 'react';

interface Comment {
  username: string;
  text: string;
  likes: string;
  timeAgo: string;
}

interface TikTokCommentProps {
  comments?: Comment[];
}

export const TikTokComment: React.FC<TikTokCommentProps> = ({
  comments = [
    { username: 'user1', text: 'Amazing content! 🔥', likes: '234', timeAgo: '2h' },
    { username: 'user2', text: 'Love this!', likes: '89', timeAgo: '5h' },
    { username: 'user3', text: 'So good 😍', likes: '156', timeAgo: '1d' },
  ],
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white rounded-t-2xl shadow-lg">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-center font-semibold text-gray-900">{comments.length} comments</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {comments.map((comment, i) => (
          <div key={i} className="flex gap-3 p-4 border-b border-gray-100">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">{comment.username}</span>
                <span className="text-xs text-gray-500">{comment.timeAgo}</span>
              </div>
              <p className="text-sm text-gray-900 mt-1">{comment.text}</p>
            </div>
            <button className="flex flex-col items-center gap-1">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-xs text-gray-600">{comment.likes}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
