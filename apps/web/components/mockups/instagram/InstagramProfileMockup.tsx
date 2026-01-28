import React from 'react';

interface InstagramProfileMockupProps {
  username?: string;
  profileImage?: string;
  bio?: string;
  website?: string;
  posts?: number;
  followers?: number;
  following?: number;
  stories?: Array<{ image?: string; title: string }>;
  gridImages?: string[];
}

export const InstagramProfileMockup: React.FC<InstagramProfileMockupProps> = ({
  username = 'username',
  profileImage = '',
  bio = 'Your bio here',
  website = 'www.example.com',
  posts = 0,
  followers = 0,
  following = 0,
  stories = [
    { title: 'Story' },
    { title: 'Story' },
    { title: 'Story' },
    { title: 'Story' }
  ],
  gridImages = []
}) => {
  return (
    <div className="w-[375px] h-[667px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
        <span className="font-semibold text-base">{username}</span>
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </div>

      {/* Profile Info */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              {profileImage ? (
                <img src={profileImage} alt={username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <div className="w-full h-full rounded-full bg-gray-200" />
              )}
            </div>
          </div>
          <div className="flex-1 flex items-center justify-around ml-4">
            <div className="text-center">
              <div className="font-semibold text-base">{posts}</div>
              <div className="text-xs text-gray-500">Posts</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-base">{followers}</div>
              <div className="text-xs text-gray-500">Followers</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-base">{following}</div>
              <div className="text-xs text-gray-500">Following</div>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-3">
          <p className="font-semibold text-sm mb-1">{username}</p>
          <p className="text-sm">{bio}</p>
          <p className="text-sm text-blue-900">{website}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <button className="flex-1 bg-gray-200 text-black font-semibold text-sm py-1.5 rounded-lg">
            Following ▼
          </button>
          <button className="flex-1 bg-gray-200 text-black font-semibold text-sm py-1.5 rounded-lg">
            Message
          </button>
          <button className="flex-1 bg-gray-200 text-black font-semibold text-sm py-1.5 rounded-lg">
            Contact
          </button>
          <button className="bg-gray-200 text-black font-semibold text-sm py-1.5 px-3 rounded-lg">
            ▼
          </button>
        </div>

        {/* Stories */}
        <div className="flex items-center gap-4 overflow-x-auto pb-2">
          <div className="flex flex-col items-center flex-shrink-0">
            <div className="w-16 h-16 rounded-full border-2 border-gray-300 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
            <span className="text-xs mt-1">Story</span>
          </div>
          {stories.map((story, idx) => (
            <div key={idx} className="flex flex-col items-center flex-shrink-0">
              <div className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden">
                {story.image ? (
                  <img src={story.image} alt={story.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200" />
                )}
              </div>
              <span className="text-xs mt-1">{story.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-t border-gray-200">
        <button className="flex-1 py-3 border-b-2 border-black">
          <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
        <button className="flex-1 py-3">
          <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polygon points="23 7 16 12 23 17 23 7"/>
            <rect x="1" y="5" width="15" height="14" rx="2"/>
          </svg>
        </button>
        <button className="flex-1 py-3">
          <svg className="w-6 h-6 mx-auto text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="2" y="7" width="20" height="15" rx="2"/>
            <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
          </svg>
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 gap-[2px]">
          {gridImages.length > 0 ? (
            gridImages.map((img, idx) => (
              <div key={idx} className="aspect-square bg-gray-100">
                <img src={img} alt={`Post ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
            ))
          ) : (
            Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="aspect-square bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <path d="M21 15l-5-5L5 21" strokeWidth="2"/>
                </svg>
              </div>
            ))
          )}
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
