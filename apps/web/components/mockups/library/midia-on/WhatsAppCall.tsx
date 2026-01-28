import React from 'react';
import { Phone, Video, Mic, MicOff } from 'lucide-react';

interface WhatsAppCallProps {
  contactName?: string;
  contactImage?: string;
  callType?: 'voice' | 'video';
  duration?: string;
}

export const WhatsAppCall: React.FC<WhatsAppCallProps> = ({
  contactName = 'Contact Name',
  contactImage = '',
  callType = 'voice',
  duration = '00:45',
}) => {
  return (
    <div className="w-full max-w-[300px] bg-gradient-to-b from-[#075E54] to-[#128C7E] rounded-2xl p-6 shadow-lg">
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto rounded-full bg-white/20 overflow-hidden mb-4">
          {contactImage && <img src={contactImage} alt={contactName} className="w-full h-full object-cover" />}
        </div>
        <h3 className="text-xl font-semibold text-white mb-1">{contactName}</h3>
        <p className="text-white/80 text-sm">{duration}</p>
      </div>

      <div className="flex items-center justify-center gap-6">
        <button className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
          <Mic className="w-6 h-6 text-white" />
        </button>
        {callType === 'video' && (
          <button className="w-14 h-14 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
            <Video className="w-6 h-6 text-white" />
          </button>
        )}
        <button className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center">
          <Phone className="w-6 h-6 text-white transform rotate-135" />
        </button>
      </div>
    </div>
  );
};
