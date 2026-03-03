import React from 'react';

interface WhatsAppBroadcastProps {
  listName?: string;
  title?: string;
  headline?: string;
  name?: string;
  recipientCount?: number;
  message?: string;
  content?: string;
  text?: string;
  body?: string;
  timestamp?: string;
}

export const WhatsAppBroadcast: React.FC<WhatsAppBroadcastProps> = ({
  listName = 'Broadcast List',
  title,
  headline,
  name,
  recipientCount = 25,
  message = 'Important announcement for all recipients',
  content,
  text,
  body,
  timestamp = '10:30 AM',
}) => {
  const resolvedListName = title ?? headline ?? name ?? listName;
  const resolvedMessage = content ?? text ?? body ?? message;

  return (
    <div className="w-full max-w-[375px] bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="bg-green-600 p-3 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="2"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14m14.14 0a10 10 0 0 0 0-14.14M7.76 7.76a6 6 0 0 0 0 8.49m8.49 0a6 6 0 0 0 0-8.49"/></svg>
        </div>
        <div className="flex-1 text-white">
          <h4 className="font-semibold text-sm">{resolvedListName}</h4>
          <p className="text-xs opacity-90">{recipientCount} recipients</p>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-green-100 rounded-lg p-3 mb-2">
          <p className="text-sm text-gray-900">{resolvedMessage}</p>
        </div>
        <p className="text-xs text-gray-500 text-right">{timestamp}</p>
      </div>
    </div>
  );
};
