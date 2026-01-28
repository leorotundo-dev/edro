import React from 'react';
import { MessageSquare } from 'lucide-react';

interface SlackThreadProps {
  username?: string;
  userAvatar?: string;
  message?: string;
  replyCount?: number;
}

export const SlackThread: React.FC<SlackThreadProps> = ({
  username = 'Username',
  userAvatar = '',
  message = 'Original message that started the thread',
  replyCount = 5,
}) => {
  return (
    <div className="w-full max-w-[600px] bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="p-4 hover:bg-gray-50">
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded bg-gray-300 overflow-hidden flex-shrink-0">
            {userAvatar && <img src={userAvatar} alt={username} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-sm text-gray-900">{username}</span>
              <span className="text-xs text-gray-500">10:30 AM</span>
            </div>
            <p className="text-sm text-gray-900 mb-2">{message}</p>
            <button className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
              <MessageSquare className="w-4 h-4" />
              {replyCount} replies
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 border-t border-gray-200 p-4 pl-16">
        <p className="text-xs text-gray-600">View thread</p>
      </div>
    </div>
  );
};
