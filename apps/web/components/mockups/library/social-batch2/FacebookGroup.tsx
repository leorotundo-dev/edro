import React from 'react';
import { Users, Lock } from 'lucide-react';

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
                  <Lock className="w-4 h-4" />
                  <span>Private group</span>
                  <span>·</span>
                </>
              )}
              <Users className="w-4 h-4" />
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
