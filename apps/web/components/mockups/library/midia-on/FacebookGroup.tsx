import React from 'react';

interface FacebookGroupProps {
  groupName?: string;
  groupCover?: string;
  members?: string;
  postsPerDay?: number;
  isPrivate?: boolean;
}

export const FacebookGroup: React.FC<FacebookGroupProps> = ({
  groupName = 'Group Name',
  groupCover = '',
  members = '12.4K members',
  postsPerDay = 15,
  isPrivate = true,
}) => {
  return (
    <div className="w-full max-w-[800px] bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="relative w-full h-[200px] bg-gray-200">
        {groupCover && <img src={groupCover} alt={groupName} className="w-full h-full object-cover" />}
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{groupName}</h1>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {isPrivate && (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Private group</span>
                  <span>·</span>
                </>
              )}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>{members}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{postsPerDay} posts per day</p>
          </div>

          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-md">
            Join Group
          </button>
        </div>

        <div className="flex gap-2 border-t border-gray-200 pt-3">
          <button className="text-sm font-semibold text-blue-600 border-b-2 border-blue-600 pb-2">Discussion</button>
          <button className="text-sm font-semibold text-gray-600 pb-2">Featured</button>
          <button className="text-sm font-semibold text-gray-600 pb-2">Members</button>
          <button className="text-sm font-semibold text-gray-600 pb-2">Events</button>
        </div>
      </div>
    </div>
  );
};
