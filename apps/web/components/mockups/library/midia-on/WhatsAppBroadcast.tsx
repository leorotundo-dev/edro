import React from 'react';
import { Radio } from 'lucide-react';

interface WhatsAppBroadcastProps {
  listName?: string;
  recipientCount?: number;
  message?: string;
  timestamp?: string;
}

export const WhatsAppBroadcast: React.FC<WhatsAppBroadcastProps> = ({
  listName = 'Broadcast List',
  recipientCount = 25,
  message = 'Important announcement for all recipients',
  timestamp = '10:30 AM',
}) => {
  return (
    <div className="w-full max-w-[375px] bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="bg-green-600 p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-white">
          <h4 className="font-semibold text-sm">{listName}</h4>
          <p className="text-xs opacity-90">{recipientCount} recipients</p>
        </div>
      </div>
      
      <div className="p-4">
        <div className="bg-green-100 rounded-lg p-3 mb-2">
          <p className="text-sm text-gray-900">{message}</p>
        </div>
        <p className="text-xs text-gray-500 text-right">{timestamp}</p>
      </div>
    </div>
  );
};
