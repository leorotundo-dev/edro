import React from 'react';
import { Users, Hash } from 'lucide-react';

interface DiscordServerProps {
  serverName?: string;
  serverIcon?: string;
  memberCount?: string;
  onlineCount?: string;
}

export const DiscordServer: React.FC<DiscordServerProps> = ({
  serverName = 'Server Name',
  serverIcon = '',
  memberCount = '1.2K',
  onlineCount = '234',
}) => {
  return (
    <div className="w-full max-w-[300px] bg-[#2B2D31] rounded-lg shadow-lg overflow-hidden">
      <div className="relative h-[80px] bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-[#2B2D31] bg-indigo-600 overflow-hidden">
            {serverIcon && <img src={serverIcon} alt={serverName} className="w-full h-full object-cover" />}
          </div>
        </div>
      </div>
      
      <div className="pt-12 px-4 pb-4">
        <h3 className="text-lg font-bold text-white mb-3">{serverName}</h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>{onlineCount} Online</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{memberCount} Members</span>
          </div>
        </div>

        <button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold py-2 rounded text-sm">
          Join Server
        </button>
      </div>
    </div>
  );
};
