import React from 'react';

interface WhatsAppMessageProps {
  contactName?: string;
  contactImage?: string;
  message?: string;
  messageImage?: string;
  time?: string;
}

export const WhatsAppMessage: React.FC<WhatsAppMessageProps> = ({
  contactName = 'Contact Name',
  contactImage = '',
  message = 'Hello! This is a WhatsApp message.',
  messageImage = '',
  time = '10:30',
}) => {
  return (
    <div className="w-full max-w-[400px] bg-[#ECE5DD] rounded-lg overflow-hidden shadow-sm">
      <div className="bg-[#075E54] p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
          {contactImage && <img src={contactImage} alt={contactName} className="w-full h-full object-cover" />}
        </div>
        <span className="text-white font-semibold text-sm">{contactName}</span>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex justify-start">
          <div className="bg-white rounded-lg rounded-tl-none p-3 max-w-[80%] shadow-sm">
            {messageImage && (
              <div className="mb-2 rounded overflow-hidden">
                <img src={messageImage} alt="Message" className="w-full object-cover" />
              </div>
            )}
            <p className="text-sm text-gray-900">{message}</p>
            <span className="text-xs text-gray-500 mt-1 block text-right">{time}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
