import React from 'react';

interface InstagramFeedMockupProps {
  username?: string;
  profileImage?: string;
  postImage?: string;
  likes?: number;
  caption?: string;
  comments?: Array<{ username: string; text: string }>;
}

export const InstagramFeedMockup: React.FC<InstagramFeedMockupProps> = ({
  username = 'username',
  profileImage = '',
  postImage = '',
  likes = 131,
  caption = 'Any example text will goes here',
  comments = [
    { username: 'example_user', text: 'Wonderful' },
    { username: 'user_example', text: 'Loved this one!' }
  ]
}) => {
  return (
    <div className="w-[375px] h-[667px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative">
      {/* Status Bar */}
      <div className="h-11 bg-white flex items-center justify-between px-6">
        <span className="text-sm font-semibold">9:41</span>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          </svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
          </svg>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="1" y="5" width="22" height="14" rx="2"/>
          </svg>
        </div>
      </div>

      {/* Instagram Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
        <span className="font-semibold text-base">Posts</span>
        <div className="w-6" />
      </div>

      {/* Post Header */}
      <div className="h-14 bg-white flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              {profileImage ? (
                <img src={profileImage} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200" />
              )}
            </div>
          </div>
          <span className="font-semibold text-sm">{username}</span>
        </div>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </div>

      {/* Post Image */}
      <div className="w-full aspect-square bg-gray-100 relative flex items-center justify-center">
        {postImage ? (
          <img src={postImage} alt="Post" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21" strokeWidth="2"/>
          </svg>
        )}
      </div>

      {/* Action Buttons */}
      <div className="h-12 bg-white flex items-center justify-between px-3">
        <div className="flex items-center gap-4">
          <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
          </svg>
          <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </div>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
        </svg>
      </div>

      {/* Likes and Caption */}
      <div className="flex-1 bg-white px-3 overflow-y-auto">
        <p className="font-semibold text-sm mb-1">{likes} likes</p>
        <p className="text-sm">
          <span className="font-semibold">{username}</span> {caption}
        </p>
        
        {/* Comments */}
        <div className="mt-2 space-y-1">
          {comments.map((comment, idx) => (
            <p key={idx} className="text-sm">
              <span className="font-semibold">{comment.username}</span> {comment.text}
            </p>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-around">
        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
        </svg>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
        </svg>
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
      </div>
    </div>
  );
};
