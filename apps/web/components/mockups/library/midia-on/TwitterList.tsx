import React from 'react';
import { List } from 'lucide-react';

interface TwitterListProps {
  listName?: string;
  description?: string;
  memberCount?: number;
  followerCount?: number;
  isPrivate?: boolean;
  creatorName?: string;
}

export const TwitterList: React.FC<TwitterListProps> = ({
  listName = 'List Name',
  description = 'A curated list of interesting accounts',
  memberCount = 47,
  followerCount = 234,
  isPrivate = false,
  creatorName = 'Creator Name',
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <List className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-gray-900">{listName}</h3>
            {isPrivate && (
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">Private</span>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">{description}</p>
          <p className="text-xs text-gray-500">by {creatorName}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="font-bold text-gray-900">{memberCount}</span>
          <span className="text-gray-500 ml-1">Members</span>
        </div>
        <div>
          <span className="font-bold text-gray-900">{followerCount}</span>
          <span className="text-gray-500 ml-1">Followers</span>
        </div>
      </div>
      
      <button className="w-full bg-gray-900 hover:bg-gray-800 text-white font-semibold py-2 rounded-full text-sm">
        Follow List
      </button>
    </div>
  );
};
