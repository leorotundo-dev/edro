import React from 'react';

interface TelegramMessageProps {
  contactName?: string;
  contactImage?: string;
  message?: string;
  messageImage?: string;
  time?: string;
}

export const TelegramMessage: React.FC<TelegramMessageProps> = ({
  contactName = 'Contact Name',
  contactImage = '',
  message = 'This is a Telegram message',
  messageImage = '',
  time = '10:30',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-[#0E1621] rounded-lg overflow-hidden shadow-sm">
      <div className="bg-[#212D3B] p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
          {contactImage && <img src={contactImage} alt={contactName} className="w-full h-full object-cover" />}
        </div>
        <span className="text-white font-semibold text-sm">{contactName}</span>
      </div>
      <div className="p-4">
        <div className="flex justify-start">
          <div className="bg-[#212D3B] rounded-lg rounded-tl-none p-3 max-w-[80%]">
            {messageImage && (
              <div className="mb-2 rounded overflow-hidden">
                <img src={messageImage} alt="Message" className="w-full object-cover" />
              </div>
            )}
            <p className="text-sm text-white">{message}</p>
            <span className="text-xs text-gray-400 mt-1 block text-right">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
