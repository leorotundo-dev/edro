import React from 'react';

interface WhatsAppGroupProps {
  groupName?: string;
  groupImage?: string;
  senderName?: string;
  message?: string;
  time?: string;
}

export const WhatsAppGroup: React.FC<WhatsAppGroupProps> = ({
  groupName = 'Group Name',
  groupImage = '',
  senderName = 'John',
  message = 'Hey everyone! How are you?',
  time = '10:30',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-[#ECE5DD] rounded-lg overflow-hidden shadow-sm">
      <div className="bg-[#075E54] p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
          {groupImage && <img src={groupImage} alt={groupName} className="w-full h-full object-cover" />}
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{groupName}</p>
          <p className="text-white/80 text-xs">5 participants</p>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-start">
          <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
            <p className="text-xs text-green-600 font-semibold mb-1">~{senderName}</p>
            <p className="text-sm text-gray-900">{message}</p>
            <span className="text-xs text-gray-500 mt-1 block text-right">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
