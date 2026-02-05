import React from 'react';

interface WhatsAppStatusProps {
  contactName?: string;
  contactImage?: string;
  statusImage?: string;
  timeAgo?: string;
}

export const WhatsAppStatus: React.FC<WhatsAppStatusProps> = ({
  contactName = 'Contact Name',
  contactImage = '',
  statusImage = '',
  timeAgo = '2h ago',
}) => {
  return (
    <div className="relative w-[300px] h-[533px] bg-black rounded-2xl overflow-hidden shadow-lg">
      {statusImage && <img src={statusImage} alt="Status" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-transparent" />
      <div className="absolute top-4 left-4 right-4">
        <div className="w-full h-1 bg-white/30 rounded-full mb-4">
          <div className="w-full h-full bg-white rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 overflow-hidden">
            {contactImage && <img src={contactImage} alt={contactName} className="w-full h-full object-cover" />}
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{contactName}</p>
            <p className="text-white/80 text-xs">{timeAgo}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
